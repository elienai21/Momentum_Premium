"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.marketRouter = void 0;
// functions/src/routes/market.ts
const express_1 = require("express");
const requireAuth_1 = require("../middleware/requireAuth");
const withTenant_1 = require("../middleware/withTenant");
const chargeCredits_1 = require("../billing/chargeCredits");
const marketAdvisorService_1 = require("../market/marketAdvisorService");
const marketConfigService_1 = require("../services/marketConfigService");
const logger_1 = require("../utils/logger");
exports.marketRouter = (0, express_1.Router)();
/**
 * POST /api/market/advice
 * Body: { question?: string; locale?: string }
 * Requer: requireAuth + withTenant
 */
exports.marketRouter.post("/advice", requireAuth_1.requireAuth, withTenant_1.withTenant, async (req, res, _next) => {
    const startedAt = Date.now();
    try {
        const tenantId = req.tenant?.info.id;
        if (!tenantId) {
            return res.status(400).json({
                ok: false,
                code: "BAD_REQUEST",
                message: "Tenant não informado.",
            });
        }
        // 0) Plano do tenant
        const plan = (req.tenant?.info?.plan || "starter");
        // 1) Guard de configuração do conselheiro de mercado
        const cfg = await (0, marketConfigService_1.getMarketConfig)(tenantId);
        if (!cfg.enabled) {
            logger_1.logger.info("market.advice.disabled", { tenantId });
            return res.status(403).json({
                ok: false,
                code: "MARKET_DISABLED",
                message: "Conselheiro de mercado desativado para este tenant.",
            });
        }
        const { question, locale } = (req.body ?? {});
        // 3) Chamada ao serviço com cobrança de créditos transacional e idempotente
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
        const result = await (0, chargeCredits_1.chargeCredits)({
            tenantId,
            plan,
            featureKey: "market.advice",
            traceId: req.traceId,
            idempotencyKey: req.header("x-idempotency-key"),
        }, async () => {
            return await (0, marketAdvisorService_1.getMarketAdvice)(input, ctx);
        });
        logger_1.logger.info("market.advice.success", {
            tenantId,
            latencyMs: Date.now() - startedAt,
        });
        return res.status(200).json({
            ok: true,
            data: result,
        });
    }
    catch (err) {
        const status = err?.status || err?.response?.status || undefined;
        const payload = err?.payload || err?.response?.data || {};
        const apiCode = payload?.code || err?.code;
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
            logger_1.logger.error("market.advice.ai_provider_error", {
                error: err?.message || String(err),
            });
            return res.status(502).json({
                ok: false,
                code: "AI_PROVIDER_ERROR",
                message: "Serviço de IA indisponível no momento. Tente novamente.",
            });
        }
        logger_1.logger.error("market.advice.unhandled_error", {
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
