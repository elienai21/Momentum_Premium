"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processAdvisorMessage = processAdvisorMessage;
const firebase_1 = require("../services/firebase");
const aiClient_1 = require("../utils/aiClient");
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
/**
 * Processa mensagens para o Advisor Financeiro.
 * Executa lógica de regras locais e fallback para IA (Gemini/OpenAI).
 */
async function processAdvisorMessage(params) {
    const { tenantId, userId, message, traceId, locale } = params;
    logger_1.logger.info("Advisor message received", { tenantId, userId, traceId });
    // 🔹 Regras locais rápidas (offline)
    if (/alerta|aviso/i.test(message)) {
        await firebase_1.db.collection("alerts").add({
            tenantId,
            userId,
            message: "Alerta automático criado pela IA",
            createdAt: new Date().toISOString(),
        });
        return {
            answer: "Criei um alerta baseado na sua solicitação.",
            actions: [{ name: "create-alert" }],
            voice: true,
        };
    }
    if (/invest/i.test(message)) {
        return {
            answer: "Sugiro avaliar fundos de renda fixa e CDBs para equilibrar risco e liquidez.",
            actions: [],
            voice: true,
        };
    }
    // 🔸 Prompt base do Advisor
    const systemPrompt = `
Você é o Advisor Financeiro Momentum.
Seu papel é fornecer conselhos práticos, éticos e objetivos sobre finanças pessoais.
Responda sempre em português (pt-BR) e com clareza em até 3 parágrafos.
Mensagem do usuário:
"${message}"
`;
    try {
        // 🔹 Chamando IA com client unificado
        const aiResponse = await (0, aiClient_1.aiClient)(systemPrompt, {
            tenantId,
            userId,
            model: "gemini",
            promptKind: "advisor",
            locale: locale || "pt-BR",
        });
        const text = aiResponse?.text || "Não encontrei informações relevantes.";
        return { answer: text, voice: true };
    }
    catch (error) {
        logger_1.logger.error("Advisor AI processing failed", { error: error.message });
        throw new errors_1.ApiError(503, "Serviço de Advisor temporariamente indisponível.");
    }
}
