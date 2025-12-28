import { db } from "src/services/firebase";
// src/ai/realTimeEngine.ts
// ============================
// 🤖 AI Real-Time Engine — worker de manutenção
// ============================
import { logger } from "../utils/logger";
import { calculateHealthScore } from "./healthScore";
import { processAdvisorMessage } from "../services/advisorService"; // já vamos alinhar o service
import * as admin from "firebase-admin";

/**
 * Roda análises de IA para um tenant específico.
 * Usado por jobs (ex: Pub/Sub / scheduler).
 */
export async function processTenantAdvisor(tenantId: string, ownerUid: string) {
  if (!tenantId || !ownerUid) {
    logger.warn("Skipping advisor job due to missing tenantId or ownerUid.");
    return;
  }

  try {
    // 1) pegar alguma mensagem padrão do owner (ou última pergunta)
    const userDoc = await db.collection("users").doc(ownerUid).get();
    const lastMessage =
      (userDoc.exists && (userDoc.data() as any)?.lastAdvisorMessage) ||
      "Faça uma análise financeira resumida do meu negócio.";

    // 2) roda advisor “headless”
    await processAdvisorMessage({
      tenantId,
      userId: ownerUid,
      message: lastMessage,
    });

    // 3) roda health score
    await calculateHealthScore(tenantId, ownerUid);

    logger.info("AI analysis tasks completed", { tenantId, ownerUid });
  } catch (error: any) {
    logger.error("AI analysis failed for tenant", {
      tenantId,
      ownerUid,
      error: error?.message ?? error,
    });
  }
}



