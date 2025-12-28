"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cfoRouter = void 0;
// functions/src/modules/cfo.ts
const express_1 = require("express");
const zod_1 = require("zod");
const errors_1 = require("../utils/errors");
// Lógica de negócio do CFO
const aiReport_1 = require("../cfo/aiReport");
const memoryEngine_1 = require("../cfo/memoryEngine");
const actionEngine_1 = require("../cfo/actionEngine");
const scenarioSimulator_1 = require("../cfo/scenarioSimulator");
const healthScore_1 = require("../cfo/healthScore");
const benchmark_1 = require("../cfo/benchmark");
const advisorContext_1 = require("../cfo/advisorContext");
const simulationEngine_1 = require("../cfo/simulationEngine");
const requireAuth_1 = require("../middleware/requireAuth");
const withTenant_1 = require("../middleware/withTenant");
// Infra
const firestore_1 = require("../core/adapters/firestore");
const requireFeature_1 = require("../middleware/requireFeature");
const firebase_1 = require("../services/firebase");
exports.cfoRouter = (0, express_1.Router)();
// Aplica autenticação e resolução de tenant em todas as rotas do CFO
exports.cfoRouter.use(requireAuth_1.requireAuth, withTenant_1.withTenant);
// ----------------------------------------------------
// POST /api/cfo/memory/rebuild
// (pode ser usado em jobs ou em ações manuais no painel)
// ----------------------------------------------------
exports.cfoRouter.post("/memory/rebuild", (0, requireFeature_1.requireFeature)("cfo_premium"), async (req, res, next) => {
    try {
        if (!req.tenant) {
            throw new errors_1.ApiError(400, "Tenant context required", req.traceId);
        }
        const tenantId = req.tenant.info.id;
        const userId = req.user?.uid;
        const memory = await (0, memoryEngine_1.buildOrUpdateMemory)(tenantId, userId);
        res.json({
            status: "ok",
            tenantId,
            memory,
        });
    }
    catch (e) {
        next(new errors_1.ApiError(500, e?.message || "Erro ao reconstruir memória do CFO", req.traceId));
    }
});
// ----------------------------------------------------
// GET /api/cfo/health
// Health Score + comentário da IA (já persiste histórico)
// ----------------------------------------------------
exports.cfoRouter.get("/health", (0, requireFeature_1.requireFeature)("cfo_premium"), async (req, res, next) => {
    try {
        if (!req.tenant) {
            throw new errors_1.ApiError(400, "Tenant context required", req.traceId);
        }
        const tenantId = req.tenant.info.id;
        const userId = req.user?.uid;
        const health = await (0, healthScore_1.computeHealthScore)(tenantId, userId);
        res.json({
            status: "ok",
            tenantId,
            health,
        });
    }
    catch (e) {
        next(new errors_1.ApiError(500, e?.message || "Erro ao calcular health score do CFO", req.traceId));
    }
});
// ----------------------------------------------------
// GET /api/cfo/action-plan
// Plano de ação tático em cima da memória financeira
// ----------------------------------------------------
exports.cfoRouter.get("/action-plan", (0, requireFeature_1.requireFeature)("cfo_premium"), async (req, res, next) => {
    try {
        if (!req.tenant) {
            throw new errors_1.ApiError(400, "Tenant context required", req.traceId);
        }
        const tenantId = req.tenant.info.id;
        const plan = await (0, actionEngine_1.buildActionPlan)(tenantId);
        res.json({
            status: "ok",
            tenantId,
            plan,
        });
    }
    catch (e) {
        next(new errors_1.ApiError(500, e?.message || "Erro ao montar plano de ação do CFO", req.traceId));
    }
});
// ----------------------------------------------------
// GET /api/cfo/benchmark
// Comparação com benchmarks (pode ficar sem gating se quiser)
// ----------------------------------------------------
exports.cfoRouter.get("/benchmark", async (req, res, next) => {
    try {
        if (!req.tenant) {
            throw new errors_1.ApiError(400, "Tenant context required", req.traceId);
        }
        const tenantId = req.tenant.info.id;
        const vertical = req.query.vertical || "finance";
        const out = await (0, benchmark_1.compareToBenchmark)(tenantId, vertical);
        res.json({
            status: "ok",
            tenantId,
            benchmark: out.benchmark,
            tenant: out.tenant,
        });
    }
    catch (e) {
        next(new errors_1.ApiError(500, e?.message || "Erro no benchmark do CFO", req.traceId));
    }
});
// ----------------------------------------------------
// GET /api/cfo/advisor-context
// Contexto consolidado para o Advisor / CFO IA
// ----------------------------------------------------
exports.cfoRouter.get("/advisor-context", (0, requireFeature_1.requireFeature)("cfo_premium"), async (req, res, next) => {
    try {
        if (!req.tenant) {
            throw new errors_1.ApiError(400, "Tenant context required", req.traceId);
        }
        const tenantId = req.tenant.info.id;
        const ctx = await (0, advisorContext_1.getAdvisorContext)(tenantId);
        res.json({
            status: "ok",
            tenantId,
            context: ctx,
        });
    }
    catch (e) {
        next(new errors_1.ApiError(500, e?.message || "Erro ao carregar contexto do advisor", req.traceId));
    }
});
// ----------------------------------------------------
// POST /api/cfo/simulate  (Simulação rápida)
// Ajustes percentuais em receita/despesa + eventos pontuais
// ----------------------------------------------------
const simulateInputSchema = zod_1.z.object({
    incDeltaPct: zod_1.z.number().min(-100).max(100).optional().default(0),
    expDeltaPct: zod_1.z.number().min(-100).max(100).optional().default(0),
    oneOffIncome: zod_1.z.number().min(0).max(1_000_000_000).optional().default(0),
    oneOffExpense: zod_1.z.number().min(0).max(1_000_000_000).optional().default(0),
});
exports.cfoRouter.post("/simulate", (0, requireFeature_1.requireFeature)("cfo_premium"), async (req, res, next) => {
    const t0 = Date.now();
    try {
        if (!req.tenant) {
            throw new errors_1.ApiError(400, "Tenant context required", req.traceId);
        }
        const tenantId = req.tenant.info.id;
        const input = simulateInputSchema.parse(req.body || {});
        const memory = await (0, memoryEngine_1.buildOrUpdateMemory)(tenantId);
        const baseIncome = memory.avgMonthlyIncome ?? 0;
        const baseExpense = memory.avgMonthlyExpense ?? 0;
        const result = (0, scenarioSimulator_1.simulateScenario)(baseIncome, baseExpense, input);
        const response = {
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
        console.log(JSON.stringify({
            level: "info",
            endpoint: "/api/cfo/simulate",
            tenantId,
            traceId: req.traceId,
            duration_ms: Date.now() - t0,
        }));
        res.status(200).json(response);
    }
    catch (e) {
        next(new errors_1.ApiError(500, e?.message || "Erro na simulação do CFO", req.traceId));
    }
});
// ----------------------------------------------------
// POST /api/cfo/simulate/advanced  (Simulação avançada)
// Usa o motor runFinancialSimulation + FirestoreAdapter
// ----------------------------------------------------
const advancedSimulationSchema = zod_1.z.object({
    recurringExpensesDelta: zod_1.z.number(), // R$
    growthRateIncome: zod_1.z.number(), // ex.: 0.1 para +10%
    oneTimeExpense: zod_1.z.number(), // R$
});
exports.cfoRouter.post("/simulate/advanced", (0, requireFeature_1.requireFeature)("cfo_premium"), async (req, res, next) => {
    try {
        if (!req.tenant) {
            throw new errors_1.ApiError(400, "Tenant context required", req.traceId);
        }
        const tenantId = req.tenant.info.id;
        const input = advancedSimulationSchema.parse(req.body || {});
        const adapter = new firestore_1.FirestoreAdapter(tenantId);
        const { currentBalance } = await adapter.getDashboardData();
        const { items: transactions } = await adapter.getRecords({ limit: 300 });
        const simulation = await (0, simulationEngine_1.runFinancialSimulation)(currentBalance, transactions, input);
        res.json({
            status: "ok",
            tenantId,
            simulation,
        });
    }
    catch (e) {
        next(new errors_1.ApiError(500, e?.message || "Erro na simulação avançada do CFO", req.traceId));
    }
});
// ----------------------------------------------------
// POST /api/cfo/ai-report  (Relatório IA avançado)
// ----------------------------------------------------
exports.cfoRouter.post("/ai-report", (0, requireFeature_1.requireFeature)("cfo_premium"), async (req, res, next) => {
    try {
        if (!req.tenant) {
            throw new errors_1.ApiError(400, "Tenant context required", req.traceId);
        }
        const tenantId = req.tenant.info.id;
        const userId = req.user?.uid;
        const planId = req.tenant.info.plan || "starter";
        const locale = req.tenant.info.locale || "pt-BR";
        const rawPeriod = typeof req.body?.period === "number"
            ? req.body.period
            : typeof req.body?.periodDays === "number"
                ? req.body.periodDays
                : undefined;
        const periodDays = rawPeriod && rawPeriod > 0 ? rawPeriod : 30;
        const result = await (0, aiReport_1.generateCfoAiReport)({
            tenantId,
            userId,
            periodDays,
            locale,
            planId,
        });
        await firebase_1.db.collection("usage_logs").add({
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
    }
    catch (e) {
        next(new errors_1.ApiError(502, e?.message || "Erro ao gerar relatório de IA do CFO", req.traceId));
    }
});
