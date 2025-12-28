// =========================================================
// 🧠 Momentum AI Insights — v8.1
// =========================================================

import { Router } from "express";
import { db } from "src/services/firebase";
import { requireAuth } from "../middleware/requireAuth";
import { z } from "zod";
import { aiClient } from "../utils/aiClient";
import { logger } from "../utils/logger";

export const insightsRouter = Router();

// 🔹 Esquema básico para validação
const InsightSchema = z.object({
  insights: z.array(z.string()).max(10),
});

// 🔹 IA analisa os dados de transações e gera recomendações
export async function getAiInsights(userId: string, tenantId: string) {
  try {
    const transactionsRef = db
      .collection("transactions")
      .where("userId", "==", userId)
      .orderBy("date", "desc")
      .limit(50);

    const snapshot = await transactionsRef.get();

    const transactions = snapshot.docs.map((d: any) => d.data());
    const context = JSON.stringify(transactions.slice(0, 15), null, 2);

    const prompt = `
Você é um analista financeiro inteligente.
Analise as transações do usuário abaixo e gere até 3 insights claros e práticos.
Cada insight deve ser direto e fácil de entender, em português natural.

Transações:
${context}
`;

    const result = await aiClient(prompt, {
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
    if (!parsed.success) throw new Error("Resposta inválida da IA");

    // Armazena cache
    await db
      .collection("ai_insights_cache")
      .doc(`${tenantId}_${userId}`)
      .set({
        ...parsed.data,
        updatedAt: Date.now(),
      });

    return parsed.data;
  } catch (e: any) {
    logger.error("getAiInsights error", { userId, error: e.message });
    return { insights: ["Não foi possível gerar insights no momento."] };
  }
}

// 🔹 Endpoint HTTP
insightsRouter.post("/", requireAuth as any, async (req: any, res, next) => {
  try {
    const uid = req.user.uid;
    const tenantId = req.user.tenantId || "default";
    const out = await getAiInsights(uid, tenantId);
    res.json(out);
  } catch (e) {
    next(e);
  }
});

