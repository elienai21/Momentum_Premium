import { db } from "src/services/firebase";
// ============================
// ⚙️ AI Actions — Momentum Automation Layer (v7.9 Fix Final)
// ============================

import * as admin from "firebase-admin";
import { logger } from "../utils/logger";

/**
 * Conjunto de ações executáveis pela IA.
 * Cada ação deve registrar logs estruturados para rastreabilidade.
 */
export const aiActions = {
  /**
   * Cria um alerta no Firestore para o usuário atual.
   */
  async createAlert(
    userId: string,
    message: string,
    tenantId?: string,
    traceId?: string
  ) {
    try {
      await db.collection("alerts").add({
        userId,
        message,
        tenantId: tenantId || null,
        createdAt: new Date().toISOString(),
      });

      logger.info("Alerta criado com sucesso", {
        userId,
        tenantId,
        traceId,
        message,
      });
    } catch (error: any) {
      logger.error("Falha ao criar alerta", { error: error.message, tenantId });
      throw error;
    }
  },

  /**
   * Categoriza uma transação com base na descrição.
   */
  async categorizeTransaction(tx: { description: string }) {
    const match = tx.description?.match(
      /(aluguel|mercado|salário|transporte|energia|internet|saúde|lazer)/i
    );
    return match ? match[0].toLowerCase() : "outros";
  },
};



