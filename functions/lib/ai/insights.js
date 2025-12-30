"use strict";
// =========================================================
// 🧠 Momentum AI Insights — v8.1
// =========================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.insightsRouter = void 0;
exports.getAiInsights = getAiInsights;
const express_1 = require("express");
const firebase_1 = require("src/services/firebase");
const requireAuth_1 = require("../middleware/requireAuth");
const zod_1 = require("zod");
const aiClient_1 = require("../utils/aiClient");
const logger_1 = require("../utils/logger");
exports.insightsRouter = (0, express_1.Router)();
// 🔹 Esquema básico para validação
const InsightSchema = zod_1.z.object({
    insights: zod_1.z.array(zod_1.z.string()).max(10),
});
// 🔹 IA analisa os dados de transações e gera recomendações
async function getAiInsights(userId, tenantId) {
    try {
        const transactionsRef = firebase_1.db
            .collection("transactions")
            .where("userId", "==", userId)
            .orderBy("date", "desc")
            .limit(50);
        const snapshot = await transactionsRef.get();
        const transactions = snapshot.docs.map((d) => d.data());
        const context = JSON.stringify(transactions.slice(0, 15), null, 2);
        const prompt = `
Você é um analista financeiro inteligente.
Analise as transações do usuário abaixo e gere até 3 insights claros e práticos.
Cada insight deve ser direto e fácil de entender, em português natural.

Transações:
${context}
`;
        const result = await (0, aiClient_1.aiClient)(prompt, {
            tenantId,
            userId,
            model: "gemini",
            promptKind: "insight",
            locale: "pt-BR",
        });
        const generated = result.text
            ?.split(/\d+\./)
            .map((x) => x.trim())
            .filter((x) => x.length > 0)
            .slice(0, 5);
        const parsed = InsightSchema.safeParse({ insights: generated });
        if (!parsed.success)
            throw new Error("Resposta inválida da IA");
        // Armazena cache
        await firebase_1.db
            .collection("ai_insights_cache")
            .doc(`${tenantId}_${userId}`)
            .set({
            ...parsed.data,
            updatedAt: Date.now(),
        });
        return parsed.data;
    }
    catch (e) {
        logger_1.logger.error("getAiInsights error", { userId, error: e.message });
        return { insights: ["Não foi possível gerar insights no momento."] };
    }
}
// 🔹 Endpoint HTTP
exports.insightsRouter.post("/", requireAuth_1.requireAuth, async (req, res, next) => {
    try {
        const uid = req.user.uid;
        const tenantId = req.user.tenantId || "default";
        const out = await getAiInsights(uid, tenantId);
        res.json(out);
    }
    catch (e) {
        next(e);
    }
});
