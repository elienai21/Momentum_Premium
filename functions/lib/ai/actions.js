"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiActions = void 0;
const firebase_1 = require("../services/firebase");
const logger_1 = require("../utils/logger");
/**
 * Conjunto de ações executáveis pela IA.
 * Cada ação deve registrar logs estruturados para rastreabilidade.
 */
exports.aiActions = {
    /**
     * Cria um alerta no Firestore para o usuário atual.
     */
    async createAlert(userId, message, tenantId, traceId) {
        try {
            await firebase_1.db.collection("alerts").add({
                userId,
                message,
                tenantId: tenantId || null,
                createdAt: new Date().toISOString(),
            });
            logger_1.logger.info("Alerta criado com sucesso", {
                userId,
                tenantId,
                traceId,
                message,
            });
        }
        catch (error) {
            logger_1.logger.error("Falha ao criar alerta", { error: error.message, tenantId });
            throw error;
        }
    },
    /**
     * Categoriza uma transação com base na descrição.
     */
    async categorizeTransaction(tx) {
        const match = tx.description?.match(/(aluguel|mercado|salário|transporte|energia|internet|saúde|lazer)/i);
        return match ? match[0].toLowerCase() : "outros";
    },
};
