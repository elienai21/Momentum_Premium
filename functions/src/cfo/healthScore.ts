// functions/src/cfo/healthScore.ts
import { db } from "src/services/firebase";
import { runGemini } from "../utils/aiClient";
import { logger } from "../utils/logger";
import { FirestoreAdapter } from "../core/adapters/firestore";
import { calculateFinancialHealthMath } from "./logic/calculator";

function toDayKey(d: Date = new Date()): string {
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
export async function computeHealthScore(tenantId: string, userId?: string) {
  const executionId = userId || "system-job";

  logger.info(
    `Starting Health Score calculation for tenant: ${tenantId}`,
    { executionId }
  );

  const adapter = new FirestoreAdapter(tenantId);
  const dashboardData = await adapter.getDashboardData();
  const { items: transactions } = await adapter.getRecords({ limit: 300 });

  const tenantDocRef = db.collection("tenants").doc(tenantId);
  const dayKey = toDayKey();

  // Caso sem dados: persistimos um estado "UNKNOWN" e não disparamos alerta
  if (transactions.length === 0) {
    logger.info(
      `No transaction data for tenant ${tenantId}. Using UNKNOWN health snapshot.`,
      { executionId }
    );

    const resultData = {
      score: 0,
      status: "UNKNOWN" as const,
      aiComment:
        "Ainda não há dados financeiros suficientes para análise. Importe ou registre suas primeiras movimentações para ver o Health Score.",
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

    await tenantDocRef.collection("health_history").doc(dayKey).set(
      {
        date: dayKey,
        score: resultData.score,
        aiComment: resultData.aiComment,
        createdAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return resultData;
  }

  // 2. Cálculo Matemático
  const health = calculateFinancialHealthMath(
    dashboardData.currentBalance,
    transactions
  );

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
    const geminiResult = await runGemini(prompt, {
      userId: executionId,
      tenantId,
      model: "gemini",
      promptKind: "health-score-insight",
      locale: "pt-BR",
    });
    aiComment = geminiResult.text || aiComment;
  } catch (err: any) {
    logger.error("AI Generation failed for health score", {
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

  await tenantDocRef.collection("health_history").doc(dayKey).set(
    {
      date: dayKey,
      score: resultData.score,
      aiComment: resultData.aiComment,
      createdAt: new Date().toISOString(),
    },
    { merge: true }
  );

  logger.info("Health Score computed and saved", {
    tenantId,
    score: health.score,
    status: health.status,
  });

  return resultData;
}

