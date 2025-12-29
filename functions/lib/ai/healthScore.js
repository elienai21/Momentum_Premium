"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateHealthScore = calculateHealthScore;
const firebase_1 = require("../services/firebase");
const aiClient_1 = require("../utils/aiClient");
const logger_1 = require("../utils/logger");
const healthAlerts_1 = require("./healthAlerts");
function toDayKey(d = new Date()) {
    const z = new Date(d);
    z.setUTCHours(0, 0, 0, 0);
    return z.toISOString().slice(0, 10); // YYYY-MM-DD
}
/**
 * Calculates the financial health score for a given tenant, generates an AI comment,
 * and stores the result in Firestore.
 */
async function calculateHealthScore(tenantId, userId) {
    const now = new Date();
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(now.getMonth() - 3);
    const transactionsSnap = await firebase_1.db
        .collection(`tenants/${tenantId}/transactions`)
        .where("date", ">=", threeMonthsAgo.toISOString().split("T")[0])
        .get();
    if (transactionsSnap.empty) {
        logger_1.logger.info(`No transaction data for health score calculation for tenant ${tenantId}.`);
        return { score: 0, aiComment: "Sem dados suficientes para análise." };
    }
    const transactions = transactionsSnap.docs.map((d) => d.data());
    const income = transactions
        .filter((t) => t.type === "Income")
        .reduce((a, b) => a + (b.amount || 0), 0);
    const expense = Math.abs(transactions
        .filter((t) => t.type === "Expense")
        .reduce((a, b) => a + (b.amount || 0), 0));
    const fixedExpense = Math.abs(transactions
        .filter((t) => t.subType?.toLowerCase().includes("fixa"))
        .reduce((a, b) => a + (b.amount || 0), 0));
    const debts = Math.abs(transactions
        .filter((t) => ["credito", "emprestimo"].includes((t.subType || "").toLowerCase()))
        .reduce((a, b) => a + (b.amount || 0), 0));
    if (income === 0) {
        return {
            score: 0,
            aiComment: "Nenhuma receita registrada nos últimos 3 meses.",
        };
    }
    const cashFlowRatio = (income - expense) / income; // Can be negative
    const marginRatio = 1 - fixedExpense / income;
    const debtRatio = 1 - debts / income;
    const fluxoCaixa = Math.max(0, cashFlowRatio);
    const liquidez = cashFlowRatio > 0 ? 1 : 0.5;
    const reserva = cashFlowRatio > 0.2 ? 1 : cashFlowRatio > 0.1 ? 0.7 : 0.4;
    const margem = Math.max(0, marginRatio);
    const endividamento = Math.max(0, debtRatio);
    const rawScore = (fluxoCaixa * 0.3 +
        liquidez * 0.2 +
        margem * 0.15 +
        endividamento * 0.15 +
        reserva * 0.2) *
        100;
    const score = Math.max(0, Math.min(100, Math.round(rawScore)));
    const prompt = `
    Você é um consultor financeiro. O score de saúde financeira de um cliente é ${score.toFixed(0)} de 100.
    A análise se baseou nas seguintes métricas (como % da receita):
    - Fluxo de Caixa (sobra): ${(cashFlowRatio * 100).toFixed(0)}%
    - Despesas Fixas: ${((fixedExpense / income) * 100).toFixed(0)}%
    - Dívidas: ${((debts / income) * 100).toFixed(0)}%
    
    Gere uma mensagem curta, direta e acionável (máximo 2 linhas) sobre a saúde financeira do cliente,
    focando no ponto mais crítico ou positivo. Responda em Português (Brasil).
  `;
    const geminiResult = await (0, aiClient_1.runGemini)(prompt, {
        userId,
        tenantId,
        model: "gemini",
        promptKind: "insight",
        locale: "pt-BR",
    });
    const aiComment = geminiResult.text || "Análise concluída. Mantenha o bom trabalho!";
    const resultData = {
        score,
        aiComment,
        metrics: { cashFlowRatio, marginRatio, debtRatio },
        updatedAt: new Date().toISOString(),
    };
    const tenantDocRef = firebase_1.db.collection("tenants").doc(tenantId);
    const dayKey = toDayKey();
    await tenantDocRef
        .collection(`insights`)
        .doc("healthScore")
        .set(resultData, { merge: true });
    await tenantDocRef.collection("health_history").doc(dayKey).set({
        date: dayKey,
        score: resultData.score,
        aiComment: resultData.aiComment,
        createdAt: new Date().toISOString(),
    }, { merge: true });
    await (0, healthAlerts_1.processHealthAlerts)(tenantId, resultData.score);
    return resultData;
}
