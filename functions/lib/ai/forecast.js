"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCashflowForecast = getCashflowForecast;
const firebase_1 = require("src/services/firebase");
const logger_1 = require("../utils/logger");
const prompts_1 = require("../config/prompts");
const errors_1 = require("../utils/errors");
const aiClient_1 = require("../utils/aiClient");
const CACHE_COLLECTION = "ai_forecast_cache";
const CACHE_TTL_HOURS = 24;
const isCacheFresh = (timestamp) => {
    return !!timestamp && Date.now() - timestamp < CACHE_TTL_HOURS * 3600 * 1000;
};
async function getCashflowForecast(userId, dashboardData, _req, tenantInfo) {
    if (!tenantInfo) {
        throw new errors_1.ApiError(400, "Tenant information is required to generate a forecast.");
    }
    const tenantId = tenantInfo.id;
    const cacheRef = firebase_1.db.collection(CACHE_COLLECTION).doc(`${userId}_${tenantId}`);
    const cacheSnap = await cacheRef.get();
    if (cacheSnap.exists && isCacheFresh(cacheSnap.data()?.generatedAt)) {
        logger_1.logger.info("Forecast served from cache", { userId, tenantId });
        return cacheSnap.data();
    }
    const promptTemplate = await (0, prompts_1.getPrompt)(tenantInfo.vertical, "forecast");
    const prompt = `
${promptTemplate}

Baseado nas transações financeiras recentes, projete o saldo estimado para os próximos 30, 60 e 90 dias.
Apresente também um breve resumo das principais observações.

Dados do usuário:
${JSON.stringify(dashboardData, null, 2)}

Responda no formato JSON:
{
  "forecast": { "30d": number, "60d": number, "90d": number },
  "insights": ["string insight 1", "string insight 2"]
}
`;
    try {
        const { text: rawText } = await (0, aiClient_1.aiClient)(prompt, {
            userId,
            tenantId,
            model: "gemini",
            promptKind: "forecast",
            locale: tenantInfo.locale ?? "pt-BR",
        });
        if (!rawText) {
            logger_1.logger.error("Forecast generation failed: no response", { tenantId, userId });
            throw new errors_1.ApiError(500, "AI forecast returned no text.");
        }
        const parsed = JSON.parse(rawText.replace(/```json|```/g, "").trim());
        const dataToCache = {
            ...parsed,
            generatedAt: Date.now(),
            userId,
            tenantId,
        };
        await cacheRef.set(dataToCache);
        logger_1.logger.info("Forecast generated and cached", { tenantId, userId });
        return parsed;
    }
    catch (error) {
        logger_1.logger.error("AI forecast error", { error: error.message, tenantId, userId });
        throw new errors_1.ApiError(503, "AI forecast service unavailable.");
    }
}
