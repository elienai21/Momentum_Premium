"use strict";
// ============================================================
// 💳 checkPlanLimit Middleware — Momentum AI Billing (v9.3 Stable)
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkPlanLimit = checkPlanLimit;
const firebase_1 = require("src/services/firebase");
const errors_1 = require("../utils/errors");
/**
 * Verifica e consome a cota de IA do usuário com base no plano.
 * @param uid Firebase UID
 * @param tokensToUse Quantidade estimada de tokens
 * @param feature (opcional) Feature a ser validada (Ex: voiceAI, visionAI, ttsNeural)
 */
async function checkPlanLimit(uid, tokensToUse, feature) {
    const userRef = firebase_1.db.collection("users").doc(uid);
    const snap = await userRef.get();
    if (!snap.exists)
        throw new errors_1.ApiError(404, "Usuário não encontrado.");
    const user = (snap.data() || {});
    const { aiTokensUsed = 0, aiTokensLimit = 20000, plan = "starter", planFeatures = {}, tenantId = "default", } = user;
    // 🔹 Verifica cota
    if (aiTokensUsed + tokensToUse > aiTokensLimit) {
        throw new errors_1.ApiError(403, `Cota de IA atingida (${aiTokensUsed}/${aiTokensLimit}). Faça upgrade de plano.`);
    }
    // 🔹 Verifica feature específica
    if (feature && planFeatures && planFeatures[feature] === false) {
        throw new errors_1.ApiError(403, `O recurso “${feature}” não está habilitado no plano atual (${plan}).`);
    }
    const newUsage = aiTokensUsed + tokensToUse;
    await userRef.update({
        aiTokensUsed: newUsage,
        lastAiUse: new Date().toISOString(),
    });
    await firebase_1.db.collection("usage_logs").add({
        uid,
        tenantId,
        feature: feature || "generic",
        tokensUsed: tokensToUse,
        totalUsed: newUsage,
        plan,
        timestamp: Date.now(),
    });
}
