// functions/src/routes/market.ts
import { Router, Request, Response, NextFunction } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { withTenant } from "../middleware/withTenant";
import { ensureCreditsOrThrow, consumeCredits } from "../billing/creditsService";
import { CREDIT_COSTS } from "../config/credits";
import { getMarketAdvice } from "../market/marketAdvisorService";
import { getMarketConfig } from "../services/marketConfigService";
import { logger } from "../lib/logger";
import type { Horizon } from "../services/marketConfigService";
import type { PlanTier } from "../billing/creditsTypes";

export const marketRouter = Router();

/**
 * POST /api/market/advice
 * Body: { question?: string; locale?: string }
 * Requer: requireAuth + withTenant
 */
marketRouter.post(
  "/advice",
  requireAuth,
  withTenant,
  async (req: Request, res: Response, _next: NextFunction) => {
    const startedAt = Date.now();

    try {
      // tenantId injetado pelo withTenant
      const tenantId: string =
        (req as any).tenantId ||
        (req as any)?.auth?.tenantId ||
        (req as any)?.user?.tenantId ||
        "";

      if (!tenantId) {
        return res.status(400).json({
          ok: false,
          code: "BAD_REQUEST",
          message: "Tenant não informado.",
        });
      }

      // 0) Plano do tenant (fallback seguro)
      const plan: PlanTier =
        ((req as any)?.planTier ||
          (req as any)?.tenant?.plan ||
          (req as any)?.auth?.planTier ||
          "Starter") as PlanTier;

      // 1) Guard de configuração do conselheiro de mercado
      const cfg = await getMarketConfig(tenantId);
      if (!cfg.enabled) {
        (logger ?? console).info?.("market.advice.disabled", { tenantId });
        return res.status(403).json({
          ok: false,
          code: "MARKET_DISABLED",
          message: "Conselheiro de mercado desativado para este tenant.",
        });
      }

      const { question, locale } = (req.body ?? {}) as {
        question?: string;
        locale?: string;
      };

      // 2) Créditos ANTES
      const featureKey = "market.advice" as const;
      const cost = CREDIT_COSTS[featureKey]; // number
      // 🔧 Mudança aqui: o 3º argumento é a feature string (não objeto)
      await ensureCreditsOrThrow(tenantId, cost, featureKey, plan);

      // 3) Chamada ao serviço (input exige tenantId, ctx separado)
      const input = {
        tenantId,
        question,
        locale,
        context: {
          sector: cfg.sector,
          region: cfg.region,
          companySize: cfg.companySize,
          horizon: (cfg.horizon ?? "90d") as Horizon,
        },
      };
      const ctx = { tenantId, plan };
      const result: any = await getMarketAdvice(input, ctx);

      // 4) Consome créditos APÓS sucesso
      await consumeCredits(tenantId, cost, { type: featureKey });

      (logger ?? console).info?.("market.advice.success", {
        tenantId,
        latencyMs: Date.now() - startedAt,
      });

      return res.status(200).json({
        ok: true,
        data: result?.data ?? result,
      });
    } catch (err: any) {
      const status: number | undefined =
        err?.status || err?.response?.status || undefined;
      const payload = err?.payload || err?.response?.data || {};
      const apiCode: string | undefined = payload?.code;

      // 402 — sem créditos
      if (status === 402 || apiCode === "NO_CREDITS") {
        return res.status(402).json({
          ok: false,
          code: "NO_CREDITS",
          message:
            payload?.message ||
            "Você não possui créditos de IA suficientes para usar este recurso.",
        });
      }

      // 502 — provedor de IA indisponível
      if (status === 502 || apiCode === "AI_PROVIDER_ERROR") {
        (logger ?? console).error?.("market.advice.ai_provider_error", {
          error: err?.message || String(err),
        });
        return res.status(502).json({
          ok: false,
          code: "AI_PROVIDER_ERROR",
          message: "Serviço de IA indisponível no momento. Tente novamente.",
        });
      }

      (logger ?? console).error?.("market.advice.unhandled_error", {
        error: err?.message || String(err),
      });
      return res.status(500).json({
        ok: false,
        code: "INTERNAL_ERROR",
        message: "Não foi possível obter a análise de mercado.",
      });
    }
  }
);

export default marketRouter;
