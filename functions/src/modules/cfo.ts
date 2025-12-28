// functions/src/modules/cfo.ts
import { Router } from "express";
import { z } from "zod";

import { ApiError } from "../utils/errors";

// Lógica de negócio do CFO
import { generateCfoAiReport } from "../cfo/aiReport";
import { buildOrUpdateMemory } from "../cfo/memoryEngine";
import { buildActionPlan } from "../cfo/actionEngine";
import { simulateScenario } from "../cfo/scenarioSimulator";
import { computeHealthScore } from "../cfo/healthScore";
import { compareToBenchmark } from "../cfo/benchmark";
import { getAdvisorContext } from "../cfo/advisorContext";
import { runFinancialSimulation } from "../cfo/simulationEngine";
import { requireAuth } from "../middleware/requireAuth";
import { withTenant } from "../middleware/withTenant";

// Infra
import { FirestoreAdapter } from "../core/adapters/firestore";
import { requireFeature } from "../middleware/requireFeature";
import { db } from "src/services/firebase";

// Tipos
import type {
  CfoSimulateApiResponse,
  CfoSimulateSuccessResponse,
} from "../types/cfo";

export const cfoRouter = Router();

// Aplica autenticação e resolução de tenant em todas as rotas do CFO
cfoRouter.use(requireAuth, withTenant);

// ----------------------------------------------------
// POST /api/cfo/memory/rebuild
// (pode ser usado em jobs ou em ações manuais no painel)
// ----------------------------------------------------
cfoRouter.post(
  "/memory/rebuild",
  requireFeature("cfo_premium"),
  async (req: any, res, next) => {
    try {
      if (!req.tenant) {
        throw new ApiError(400, "Tenant context required", req.traceId);
      }

      const tenantId = req.tenant.info.id as string;
      const userId = req.user?.uid as string | undefined;

      const memory = await buildOrUpdateMemory(tenantId, userId);

      res.json({
        status: "ok",
        tenantId,
        memory,
      });
    } catch (e: any) {
      next(
        new ApiError(
          500,
          e?.message || "Erro ao reconstruir memória do CFO",
          req.traceId
        )
      );
    }
  }
);

// ----------------------------------------------------
// GET /api/cfo/health
// Health Score + comentário da IA (já persiste histórico)
// ----------------------------------------------------
cfoRouter.get(
  "/health",
  requireFeature("cfo_premium"),
  async (req: any, res, next) => {
    try {
      if (!req.tenant) {
        throw new ApiError(400, "Tenant context required", req.traceId);
      }

      const tenantId = req.tenant.info.id as string;
      const userId = req.user?.uid as string | undefined;

      const health = await computeHealthScore(tenantId, userId);

      res.json({
        status: "ok",
        tenantId,
        health,
      });
    } catch (e: any) {
      next(
        new ApiError(
          500,
          e?.message || "Erro ao calcular health score do CFO",
          req.traceId
        )
      );
    }
  }
);

// ----------------------------------------------------
// GET /api/cfo/action-plan
// Plano de ação tático em cima da memória financeira
// ----------------------------------------------------
cfoRouter.get(
  "/action-plan",
  requireFeature("cfo_premium"),
  async (req: any, res, next) => {
    try {
      if (!req.tenant) {
        throw new ApiError(400, "Tenant context required", req.traceId);
      }

      const tenantId = req.tenant.info.id as string;
      const plan = await buildActionPlan(tenantId);

      res.json({
        status: "ok",
        tenantId,
        plan,
      });
    } catch (e: any) {
      next(
        new ApiError(
          500,
          e?.message || "Erro ao montar plano de ação do CFO",
          req.traceId
        )
      );
    }
  }
);

// ----------------------------------------------------
// GET /api/cfo/benchmark
// Comparação com benchmarks (pode ficar sem gating se quiser)
// ----------------------------------------------------
cfoRouter.get("/benchmark", async (req: any, res, next) => {
  try {
    if (!req.tenant) {
      throw new ApiError(400, "Tenant context required", req.traceId);
    }

    const tenantId = req.tenant.info.id as string;
    const vertical = (req.query.vertical as string | undefined) || "finance";

    const out = await compareToBenchmark(tenantId, vertical);

    res.json({
      status: "ok",
      tenantId,
      benchmark: out.benchmark,
      tenant: out.tenant,
    });
  } catch (e: any) {
    next(
      new ApiError(
        500,
        e?.message || "Erro no benchmark do CFO",
        req.traceId
      )
    );
  }
});

// ----------------------------------------------------
// GET /api/cfo/advisor-context
// Contexto consolidado para o Advisor / CFO IA
// ----------------------------------------------------
cfoRouter.get(
  "/advisor-context",
  requireFeature("cfo_premium"),
  async (req: any, res, next) => {
    try {
      if (!req.tenant) {
        throw new ApiError(400, "Tenant context required", req.traceId);
      }

      const tenantId = req.tenant.info.id as string;
      const ctx = await getAdvisorContext(tenantId);

      res.json({
        status: "ok",
        tenantId,
        context: ctx,
      });
    } catch (e: any) {
      next(
        new ApiError(
          500,
          e?.message || "Erro ao carregar contexto do advisor",
          req.traceId
        )
      );
    }
  }
);

// ----------------------------------------------------
// POST /api/cfo/simulate  (Simulação rápida)
// Ajustes percentuais em receita/despesa + eventos pontuais
// ----------------------------------------------------
const simulateInputSchema = z.object({
  incDeltaPct: z.number().min(-100).max(100).optional().default(0),
  expDeltaPct: z.number().min(-100).max(100).optional().default(0),
  oneOffIncome: z.number().min(0).max(1_000_000_000).optional().default(0),
  oneOffExpense: z.number().min(0).max(1_000_000_000).optional().default(0),
});

cfoRouter.post(
  "/simulate",
  requireFeature("cfo_premium"),
  async (req: any, res, next) => {
    const t0 = Date.now();

    try {
      if (!req.tenant) {
        throw new ApiError(400, "Tenant context required", req.traceId);
      }

      const tenantId = req.tenant.info.id as string;
      const input = simulateInputSchema.parse(req.body || {});

      const memory = await buildOrUpdateMemory(tenantId);
      const baseIncome = memory.avgMonthlyIncome ?? 0;
      const baseExpense = memory.avgMonthlyExpense ?? 0;

      const result = simulateScenario(baseIncome, baseExpense, input);

      const response: CfoSimulateSuccessResponse = {
        ok: true,
        tenantId,
        base: {
          income: baseIncome,
          expense: baseExpense,
        },
        scenario: input,
        result,
        meta: {
          traceId: req.traceId,
        },
      };

      console.log(
        JSON.stringify({
          level: "info",
          endpoint: "/api/cfo/simulate",
          tenantId,
          traceId: req.traceId,
          duration_ms: Date.now() - t0,
        })
      );

      res.status(200).json(response as CfoSimulateApiResponse);
    } catch (e: any) {
      next(
        new ApiError(
          500,
          e?.message || "Erro na simulação do CFO",
          req.traceId
        )
      );
    }
  }
);

// ----------------------------------------------------
// POST /api/cfo/simulate/advanced  (Simulação avançada)
// Usa o motor runFinancialSimulation + FirestoreAdapter
// ----------------------------------------------------
const advancedSimulationSchema = z.object({
  recurringExpensesDelta: z.number(), // R$
  growthRateIncome: z.number(),       // ex.: 0.1 para +10%
  oneTimeExpense: z.number(),         // R$
});

cfoRouter.post(
  "/simulate/advanced",
  requireFeature("cfo_premium"),
  async (req: any, res, next) => {
    try {
      if (!req.tenant) {
        throw new ApiError(400, "Tenant context required", req.traceId);
      }

      const tenantId = req.tenant.info.id as string;
      const input = advancedSimulationSchema.parse(req.body || {});

      const adapter = new FirestoreAdapter(tenantId);
      const { currentBalance } = await adapter.getDashboardData();
      const { items: transactions } = await adapter.getRecords({ limit: 300 });

      const simulation = await runFinancialSimulation(
        currentBalance,
        transactions,
        input
      );

      res.json({
        status: "ok",
        tenantId,
        simulation,
      });
    } catch (e: any) {
      next(
        new ApiError(
          500,
          e?.message || "Erro na simulação avançada do CFO",
          req.traceId
        )
      );
    }
  }
);

// ----------------------------------------------------
// POST /api/cfo/ai-report  (Relatório IA avançado)
// ----------------------------------------------------
cfoRouter.post(
  "/ai-report",
  requireFeature("cfo_premium"),
  async (req: any, res, next) => {
    try {
      if (!req.tenant) {
        throw new ApiError(400, "Tenant context required", req.traceId);
      }

      const tenantId = req.tenant.info.id as string;
      const userId = req.user?.uid as string | undefined;
      const planId = req.tenant.info.plan || "starter";
      const locale = req.tenant.info.locale || "pt-BR";

      const rawPeriod =
        typeof req.body?.period === "number"
          ? req.body.period
          : typeof req.body?.periodDays === "number"
          ? req.body.periodDays
          : undefined;

      const periodDays = rawPeriod && rawPeriod > 0 ? rawPeriod : 30;

      const result = await generateCfoAiReport({
        tenantId,
        userId,
        periodDays,
        locale,
        planId,
      });

      await db.collection("usage_logs").add({
        tenantId,
        uid: userId || "anonymous",
        feature: "cfo_ai_report",
        tokens: result?.meta?.tokens ?? 0,
        provider: result?.meta?.provider || "mock",
        createdAt: Date.now(),
      });

      res.json({
        status: "ok",
        report: result.report,
        meta: result.meta,
      });
    } catch (e: any) {
      next(
        new ApiError(
          502,
          e?.message || "Erro ao gerar relatório de IA do CFO",
          req.traceId
        )
      );
    }
  }
);

