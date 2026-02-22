import { RecordItem } from "../types";

export interface SimulationScenario {
  // Mudanças recorrentes mensais (ex: contratar funcionário)
  recurringExpensesDelta?: number; 
  recurringIncomeDelta?: number;
  
  // Mudanças pontuais (ex: comprar máquina)
  oneTimeExpense?: number;
  oneTimeIncome?: number;
  
  // Percentuais de crescimento/corte (ex: +10% receita, -5% custo)
  growthRateIncome?: number; // 0.1 = 10%
  cutRateExpense?: number;   // 0.05 = 5%
}

export interface SimulationResult {
  baseline: {
    avgIncome: number;
    avgExpense: number;
    runwayMonths: number;
  };
  projected: {
    avgIncome: number;
    avgExpense: number;
    runwayMonths: number;
    netCashFlow: number;
  };
  deltas: {
    runwayImpact: number; // Diferença em meses
    cashImpact: number;   // Diferença em R$ no fluxo mensal
  };
  monthlyProjection: Array<{ month: number; balance: number }>;
}

/**
 * Motor de Simulação Financeira
 */
export const runFinancialSimulation = (
  currentBalance: number,
  historicalTransactions: RecordItem[],
  scenario: SimulationScenario
): SimulationResult => {
  // 1. Calcular Baseline (Médias dos últimos 3 meses)
  let totalIncome = 0;
  let totalExpense = 0;
  
  // Filtra apenas Income/Expense para simplificar
  historicalTransactions.forEach(tx => {
    const val = Number(tx.amount || 0);
    const type = (tx.type || '').toLowerCase();
    const isIncome = type === 'income' || type === 'credit' || val > 0;
    
    if (isIncome) totalIncome += Math.abs(val);
    else totalExpense += Math.abs(val);
  });

  // Normaliza para média mensal (assumindo que o array transactions tem aprox 3 meses ou normalizado no adapter)
  // Por segurança, dividimos por 3 hardcoded ou pelo período real se disponível. Vamos usar 3.
  const baseAvgIncome = totalIncome / 3;
  const baseAvgExpense = totalExpense / 3;
  const baseBurn = baseAvgExpense - baseAvgIncome;
  const baseRunway = baseBurn > 0 ? currentBalance / baseBurn : 99;

  // 2. Aplicar Cenário (Projeção)
  // Aplica percentuais primeiro
  let projIncome = baseAvgIncome * (1 + (scenario.growthRateIncome || 0));
  let projExpense = baseAvgExpense * (1 - (scenario.cutRateExpense || 0));

  // Aplica valores absolutos recorrentes
  projIncome += (scenario.recurringIncomeDelta || 0);
  projExpense += (scenario.recurringExpensesDelta || 0);

  // Considera One-Off no saldo inicial da projeção (impacta o caixa, não o fluxo mensal recorrente)
  const projStartBalance = currentBalance + (scenario.oneTimeIncome || 0) - (scenario.oneTimeExpense || 0);

  // Novos KPIs projetados
  const projNetCash = projIncome - projExpense;
  const projBurn = projExpense - projIncome; // Se positivo, está queimando caixa
  const projRunway = projBurn > 0 ? projStartBalance / projBurn : 99;

  // 3. Gerar Projeção mês a mês (6 meses)
  const monthlyProjection = [];
  let runningBalance = projStartBalance;

  for (let i = 1; i <= 6; i++) {
    runningBalance += projNetCash;
    monthlyProjection.push({
      month: i,
      balance: Math.round(runningBalance)
    });
  }

  return {
    baseline: {
      avgIncome: Math.round(baseAvgIncome),
      avgExpense: Math.round(baseAvgExpense),
      runwayMonths: Number(baseRunway.toFixed(1))
    },
    projected: {
      avgIncome: Math.round(projIncome),
      avgExpense: Math.round(projExpense),
      runwayMonths: Number(projRunway.toFixed(1)),
      netCashFlow: Math.round(projNetCash)
    },
    deltas: {
      runwayImpact: Number((projRunway - baseRunway).toFixed(1)),
      cashImpact: Math.round(projNetCash - (baseAvgIncome - baseAvgExpense))
    },
    monthlyProjection
  };
};