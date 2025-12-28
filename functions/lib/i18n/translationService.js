"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.translateText = translateText;
// ============================
// 🌐 Translation Service — Momentum AI (v7.9 Fix Final)
// ============================
const logger_1 = require("../utils/logger");
const aiClient_1 = require("../utils/aiClient");
/**
 * Translates a given text using Gemini or OpenAI.
 * @param text Source text
 * @param targetLang Target language (e.g. 'pt-BR', 'en-US')
 * @param traceId Optional trace ID
 */
async function translateText(text, targetLang, traceId) {
    try {
        const prompt = `
Traduza o texto abaixo para ${targetLang}, mantendo o tom natural e contextual.
Responda apenas com o texto traduzido, sem explicações.

Texto:
"${text}"
`;
        const result = await (0, aiClient_1.aiClient)(prompt, {
            tenantId: "system",
            userId: "system",
            model: "gemini",
            promptKind: "translation",
            locale: targetLang,
        });
        if (!result?.text) {
            logger_1.logger.warn("Gemini translation returned empty response", {
                text,
                targetLang,
                traceId,
            });
            return text;
        }
        return result.text;
    }
    catch (error) {
        logger_1.logger.error("Gemini translation failed, fallback to original", {
            text,
            targetLang,
            error: error.message,
            traceId,
        });
        return text;
    }
}
