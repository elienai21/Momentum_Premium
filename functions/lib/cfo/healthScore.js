"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeHealthScore = computeHealthScore;
// functions/src/cfo/healthScore.ts
const firebase_1 = require("src/services/firebase");
const aiClient_1 = require("../utils/aiClient");
const logger_1 = require("../utils/logger");
const firestore_1 = require("../core/adapters/firestore");
const calculator_1 = require("./logic/calculator");
function toDayKey(d = new Date()) {
    const z = new Date(d);
    z.setUTCHours(0, 0, 0, 0);
    return z.toISOString().slice(0, 10); // YYYY-MM-DD
}
/**
 * Calcula o Health Score financeiro de um tenant.
 * Orquestra a busca de dados, cálculo matemático, análise de IA e persistência.
 *
 * @param tenantId ID do tenant
 * @param userId   Opcional. Se fornecido, é usado para contexto de IA e logs.
 */
async function computeHealthScore(tenantId, userId) {
    const executionId = userId || "system-job";
    logger_1.logger.info(`Starting Health Score calculation for tenant: ${tenantId}`, { executionId });
    const adapter = new firestore_1.FirestoreAdapter(tenantId);
    const dashboardData = await adapter.getDashboardData();
    const { items: transactions } = await adapter.getRecords({ limit: 300 });
    const tenantDocRef = firebase_1.db.collection("tenants").doc(tenantId);
    const dayKey = toDayKey();
    // Caso sem dados: persistimos um estado "UNKNOWN" e não disparamos alerta
    if (transactions.length === 0) {
        logger_1.logger.info(`No transaction data for tenant ${tenantId}. Using UNKNOWN health snapshot.`, { executionId });
        const resultData = {
            score: 0,
            status: "UNKNOWN",
            aiComment: "Ainda não há dados financeiros suficientes para análise. Importe ou registre suas primeiras movimentações para ver o Health Score.",
            metrics: {
                cashFlowRatio: 0,
                marginRatio: 0,
                debtRatio: 0,
            },
            runwayMonths: 0,
            updatedAt: new Date().toISOString(),
        };
        await tenantDocRef
            .collection("insights")
            .doc("healthScore")
            .set(resultData, { merge: true });
        await tenantDocRef.collection("health_history").doc(dayKey).set({
            date: dayKey,
            score: resultData.score,
            aiComment: resultData.aiComment,
            createdAt: new Date().toISOString(),
        }, { merge: true });
        return resultData;
    }
    // 2. Cálculo Matemático
    const health = (0, calculator_1.calculateFinancialHealthMath)(dashboardData.currentBalance, transactions);
    // 3. Geração de Insight via IA
    let aiComment = "Análise indisponível no momento.";
    const prompt = `
Atue como um CFO Sênior. O Health Score da empresa é ${health.score}/100 (${health.status}).

Dados Técnicos:
- Runway (caixa disponível): ${health.runwayMonths.toFixed(1)} meses
- Burn Rate Médio: R$ ${health.avgBurnRate.toFixed(2)}
- Fluxo de Caixa Líquido: R$ ${health.netCashFlow.toFixed(2)}

Gere um comentário executivo curto (máx 2 frases).
Se o status for CRITICAL ou DANGER, alerte sobre risco de insolvência.
Se for EXCELLENT, sugira otimização de investimentos.
Responda em Português do Brasil.
`.trim();
    try {
        const geminiResult = await (0, aiClient_1.runGemini)(prompt, {
            userId: executionId,
            tenantId,
            model: "gemini",
            promptKind: "health-score-insight",
            locale: "pt-BR",
        });
        aiComment = geminiResult.text || aiComment;
    }
    catch (err) {
        logger_1.logger.error("AI Generation failed for health score", {
            tenantId,
            error: err?.message,
        });
    }
    const resultData = {
        score: health.score,
        status: health.status,
        aiComment,
        metrics: health.metrics,
        runwayMonths: health.runwayMonths,
        updatedAt: new Date().toISOString(),
    };
    await tenantDocRef
        .collection("insights")
        .doc("healthScore")
        .set(resultData, { merge: true });
    await tenantDocRef.collection("health_history").doc(dayKey).set({
        date: dayKey,
        score: resultData.score,
        aiComment: resultData.aiComment,
        createdAt: new Date().toISOString(),
    }, { merge: true });
    logger_1.logger.info("Health Score computed and saved", {
        tenantId,
        score: health.score,
        status: health.status,
    });
    return resultData;
}
