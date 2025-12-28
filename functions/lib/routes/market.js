"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.marketRouter = void 0;
// functions/src/routes/market.ts
const express_1 = require("express");
const requireAuth_1 = require("../middleware/requireAuth");
const withTenant_1 = require("../middleware/withTenant");
const creditsService_1 = require("../billing/creditsService");
const credits_1 = require("../config/credits");
const marketAdvisorService_1 = require("../market/marketAdvisorService");
const marketConfigService_1 = require("../services/marketConfigService");
const logger_1 = require("../lib/logger");
exports.marketRouter = (0, express_1.Router)();
/**
 * POST /api/market/advice
 * Body: { question?: string; locale?: string }
 * Requer: requireAuth + withTenant
 */
exports.marketRouter.post("/advice", requireAuth_1.requireAuth, withTenant_1.withTenant, async (req, res, _next) => {
    const startedAt = Date.now();
    try {
        // tenantId injetado pelo withTenant
        const tenantId = req.tenantId ||
            req?.auth?.tenantId ||
            req?.user?.tenantId ||
            "";
        if (!tenantId) {
            return res.status(400).json({
                ok: false,
                code: "BAD_REQUEST",
                message: "Tenant não informado.",
            });
        }
        // 0) Plano do tenant (fallback seguro)
        const plan = (req?.planTier ||
            req?.tenant?.plan ||
            req?.auth?.planTier ||
            "Starter");
        // 1) Guard de configuração do conselheiro de mercado
        const cfg = await (0, marketConfigService_1.getMarketConfig)(tenantId);
        if (!cfg.enabled) {
            (logger_1.logger ?? console).info?.("market.advice.disabled", { tenantId });
            return res.status(403).json({
                ok: false,
                code: "MARKET_DISABLED",
                message: "Conselheiro de mercado desativado para este tenant.",
            });
        }
        const { question, locale } = (req.body ?? {});
        // 2) Créditos ANTES
        const featureKey = "market.advice";
        const cost = credits_1.CREDIT_COSTS[featureKey]; // number
        // 🔧 Mudança aqui: o 3º argumento é a feature string (não objeto)
        await (0, creditsService_1.ensureCreditsOrThrow)(tenantId, cost, featureKey, plan);
        // 3) Chamada ao serviço (input exige tenantId, ctx separado)
        const input = {
            tenantId,
            question,
            locale,
            context: {
                sector: cfg.sector,
                region: cfg.region,
                companySize: cfg.companySize,
                horizon: (cfg.horizon ?? "90d"),
            },
        };
        const ctx = { tenantId, plan };
        const result = await (0, marketAdvisorService_1.getMarketAdvice)(input, ctx);
        // 4) Consome créditos APÓS sucesso
        await (0, creditsService_1.consumeCredits)(tenantId, cost, { type: featureKey });
        (logger_1.logger ?? console).info?.("market.advice.success", {
            tenantId,
            latencyMs: Date.now() - startedAt,
        });
        return res.status(200).json({
            ok: true,
            data: result?.data ?? result,
        });
    }
    catch (err) {
        const status = err?.status || err?.response?.status || undefined;
        const payload = err?.payload || err?.response?.data || {};
        const apiCode = payload?.code;
        // 402 — sem créditos
        if (status === 402 || apiCode === "NO_CREDITS") {
            return res.status(402).json({
                ok: false,
                code: "NO_CREDITS",
                message: payload?.message ||
                    "Você não possui créditos de IA suficientes para usar este recurso.",
            });
        }
        // 502 — provedor de IA indisponível
        if (status === 502 || apiCode === "AI_PROVIDER_ERROR") {
            (logger_1.logger ?? console).error?.("market.advice.ai_provider_error", {
                error: err?.message || String(err),
            });
            return res.status(502).json({
                ok: false,
                code: "AI_PROVIDER_ERROR",
                message: "Serviço de IA indisponível no momento. Tente novamente.",
            });
        }
        (logger_1.logger ?? console).error?.("market.advice.unhandled_error", {
            error: err?.message || String(err),
        });
        return res.status(500).json({
            ok: false,
            code: "INTERNAL_ERROR",
            message: "Não foi possível obter a análise de mercado.",
        });
    }
});
exports.default = exports.marketRouter;
