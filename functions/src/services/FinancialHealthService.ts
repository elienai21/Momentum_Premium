import { RecordItem } from "../types";

export type HealthStatus = 'EXCELLENT' | 'STABLE' | 'CRITICAL' | 'DANGER';

export interface HealthScoreResult {
  score: number; // 0 a 100
  status: HealthStatus;
  metrics: {
    runwayMonths: number;
    avgBurnRate: number;
    netCashFlow: number;
    revenueTrend: number; // % crescimento
  };
  insights: string[];
}

/**
 * Calcula a saúde financeira baseada em 3 pilares:
 * 1. Liquidez (Runway) - 50% do peso
 * 2. Tendência (Crescimento de Receita) - 30% do peso
 * 3. Eficiência (Net Cash Flow) - 20% do peso
 */
export const calculateFinancialHealth = (
  currentBalance: number,
  transactions: RecordItem[] // Últimos 3-6 meses
): HealthScoreResult => {
  const insights: string[] = [];
  
  // 1. Agregação de Dados
  let totalIncome = 0;
  let totalExpense = 0;
  let incomeLastMonth = 0;
  let incomeTwoMonthsAgo = 0;
  
  const now = new Date();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const twoMonthsAgoStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);

  transactions.forEach(tx => {
    const amount = Number(tx.amount);
    const txDate = new Date(tx.date);
    const isExpense = amount < 0 || tx.type === 'Expense';
    
    if (isExpense) {
      totalExpense += Math.abs(amount);
    } else {
      totalIncome += amount;
      
      if (txDate >= lastMonthStart) incomeLastMonth += amount;
      else if (txDate >= twoMonthsAgoStart && txDate < lastMonthStart) incomeTwoMonthsAgo += amount;
    }
  });

  // Média mensal (assumindo que transactions contém X meses, vamos normalizar por 3 meses para média movel)
  const monthsAnalyzed = 3; 
  const avgBurnRate = totalExpense / monthsAnalyzed;
  const avgIncome = totalIncome / monthsAnalyzed;
  const netCashFlow = avgIncome - avgBurnRate;

  // 2. Cálculo do Runway (Meses de vida)
  const runwayMonths = avgBurnRate > 0 ? currentBalance / avgBurnRate : 999;

  // 3. Cálculo de Tendência
  const revenueTrend = incomeTwoMonthsAgo > 0 
    ? ((incomeLastMonth - incomeTwoMonthsAgo) / incomeTwoMonthsAgo) * 100 
    : 0;

  // 4. Algoritmo de Score (0-100)
  let score = 0;

  // Peso A: Runway (Máx 50 pts)
  if (runwayMonths >= 12) score += 50;
  else if (runwayMonths >= 6) score += 40;
  else if (runwayMonths >= 3) score += 20;
  else score += 0; // Crítico

  // Peso B: Tendência (Máx 30 pts)
  if (revenueTrend > 10) score += 30; // Crescimento forte
  else if (revenueTrend > 0) score += 20; // Estável/Crescendo
  else score += 5; // Caindo

  // Peso C: Eficiência (Máx 20 pts)
  if (netCashFlow > 0) score += 20; // Cash positive
  else if (Math.abs(netCashFlow) < (currentBalance * 0.1)) score += 10; // Burn controlado

  // Normalização
  score = Math.min(100, Math.max(0, score));

  // 5. Determinação de Status
  let status: HealthStatus = 'DANGER';
  if (score >= 80) status = 'EXCELLENT';
  else if (score >= 60) status = 'STABLE';
  else if (score >= 30) status = 'CRITICAL';

  // 6. Geração de Insights
  if (runwayMonths < 3) insights.push("⚠️ Runway crítico: menos de 3 meses de caixa.");
  if (netCashFlow < 0) insights.push(`📉 Queima de caixa mensal média: ${avgBurnRate.toFixed(2)}.`);
  if (revenueTrend > 15) insights.push("🚀 Receita crescendo rapidamente (+15% MoM).");
  if (currentBalance > avgBurnRate * 12) insights.push("🛡️ Caixa robusto para investimentos.");

  return {
    score,
    status,
    metrics: {
      runwayMonths,
      avgBurnRate,
      netCashFlow,
      revenueTrend
    },
    insights
  };
};