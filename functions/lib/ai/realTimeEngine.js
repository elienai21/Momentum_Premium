"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processTenantAdvisor = processTenantAdvisor;
const firebase_1 = require("src/services/firebase");
// src/ai/realTimeEngine.ts
// ============================
// 🤖 AI Real-Time Engine — worker de manutenção
// ============================
const logger_1 = require("../utils/logger");
const healthScore_1 = require("./healthScore");
const advisorService_1 = require("../services/advisorService"); // já vamos alinhar o service
/**
 * Roda análises de IA para um tenant específico.
 * Usado por jobs (ex: Pub/Sub / scheduler).
 */
async function processTenantAdvisor(tenantId, ownerUid) {
    if (!tenantId || !ownerUid) {
        logger_1.logger.warn("Skipping advisor job due to missing tenantId or ownerUid.");
        return;
    }
    try {
        // 1) pegar alguma mensagem padrão do owner (ou última pergunta)
        const userDoc = await firebase_1.db.collection("users").doc(ownerUid).get();
        const lastMessage = (userDoc.exists && userDoc.data()?.lastAdvisorMessage) ||
            "Faça uma análise financeira resumida do meu negócio.";
        // 2) roda advisor “headless”
        await (0, advisorService_1.processAdvisorMessage)({
            tenantId,
            userId: ownerUid,
            message: lastMessage,
        });
        // 3) roda health score
        await (0, healthScore_1.calculateHealthScore)(tenantId, ownerUid);
        logger_1.logger.info("AI analysis tasks completed", { tenantId, ownerUid });
    }
    catch (error) {
        logger_1.logger.error("AI analysis failed for tenant", {
            tenantId,
            ownerUid,
            error: error?.message ?? error,
        });
    }
}
