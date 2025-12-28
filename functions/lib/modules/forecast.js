"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.forecastRouter = void 0;
// ============================
// 📈 Forecast Module — AI Cashflow (v7.9 Fix Final)
// ============================
const express_1 = require("express");
require("../types");
const aiClient_1 = require("../utils/aiClient");
const requireAuth_1 = require("../middleware/requireAuth");
const withTenant_1 = require("../middleware/withTenant");
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
const zod_1 = require("zod");
exports.forecastRouter = (0, express_1.Router)();
exports.forecastRouter.use(requireAuth_1.requireAuth, withTenant_1.withTenant);
const forecastSchema = zod_1.z.object({
    history: zod_1.z.string().min(10, "History must be a stringified JSON."),
});
exports.forecastRouter.post("/", async (req, res, next) => {
    try {
        if (!req.tenant)
            throw new errors_1.ApiError(400, "Tenant context required.");
        if (!req.user)
            throw new errors_1.ApiError(401, "Authentication required.");
        const { history } = forecastSchema.parse(req.body);
        const prompt = `
Você é um analista financeiro especialista em pequenos negócios.
Analise o seguinte histórico de transações (em JSON) de um cliente no Brasil.
Projete o saldo futuro para os próximos 30, 60 e 90 dias.
Apresente o resultado em texto simples (markdown), com um resumo dos principais riscos e oportunidades.

Histórico de transações:
${history}
`;
        const result = await (0, aiClient_1.aiClient)(prompt, {
            userId: req.user.uid,
            tenantId: req.tenant.info.id,
            model: "gemini",
            promptKind: "forecast",
            locale: req.tenant.info.locale ?? "pt-BR",
        });
        if (!result?.text) {
            logger_1.logger.error("AI forecast returned no text", {
                tenantId: req.tenant.info.id,
                userId: req.user.uid,
            });
            throw new errors_1.ApiError(500, "Forecast generation failed (empty response).");
        }
        res.json({
            status: "success",
            data: {
                forecast: result.text,
                tenantId: req.tenant.info.id,
                traceId: req?.traceId,
            },
        });
    }
    catch (err) {
        logger_1.logger.error("Forecast endpoint failed", {
            error: err?.message ?? err,
            tenantId: req.tenant?.info?.id,
            userId: req.user?.uid,
        });
        next(err);
    }
});
