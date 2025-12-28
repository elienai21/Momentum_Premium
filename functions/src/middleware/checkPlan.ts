// ============================================================
// 💳 checkPlanLimit Middleware — Momentum AI Billing (v9.3 Stable)
// ============================================================

import { db } from "src/services/firebase";
import { ApiError } from "../utils/errors";

// 🔸 Tipagem centralizada
interface UserPlanData {
  aiTokensUsed?: number;
  aiTokensLimit?: number;
  plan?: string;
  planFeatures?: Record<string, boolean>;
  tenantId?: string;
}

/**
 * Verifica e consome a cota de IA do usuário com base no plano.
 * @param uid Firebase UID
 * @param tokensToUse Quantidade estimada de tokens
 * @param feature (opcional) Feature a ser validada (Ex: voiceAI, visionAI, ttsNeural)
 */
export async function checkPlanLimit(
  uid: string,
  tokensToUse: number,
  feature?: "ttsNeural" | "visionAI" | "textAI" | "voiceAI" | "speech"
) {
  const userRef = db.collection("users").doc(uid);
  const snap = await userRef.get();

  if (!snap.exists) throw new ApiError(404, "Usuário não encontrado.");

  const user = (snap.data() || {}) as UserPlanData;
  const {
    aiTokensUsed = 0,
    aiTokensLimit = 20000,
    plan = "starter",
    planFeatures = {},
    tenantId = "default",
  } = user;

  // 🔹 Verifica cota
  if (aiTokensUsed + tokensToUse > aiTokensLimit) {
    throw new ApiError(
      403,
      `Cota de IA atingida (${aiTokensUsed}/${aiTokensLimit}). Faça upgrade de plano.`
    );
  }

  // 🔹 Verifica feature específica
  if (feature && planFeatures && planFeatures[feature] === false) {
    throw new ApiError(
      403,
      `O recurso “${feature}” não está habilitado no plano atual (${plan}).`
    );
  }

  const newUsage = aiTokensUsed + tokensToUse;

  await userRef.update({
    aiTokensUsed: newUsage,
    lastAiUse: new Date().toISOString(),
  });

  await db.collection("usage_logs").add({
    uid,
    tenantId,
    feature: feature || "generic",
    tokensUsed: tokensToUse,
    totalUsed: newUsage,
    plan,
    timestamp: Date.now(),
  });
}

