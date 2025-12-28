"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateFinancialHealthMath = void 0;
/**
 * Função Pura: Recebe dados brutos e retorna o diagnóstico.
 * Normaliza os tipos (Income/Expense/credit/debit) aqui dentro.
 */
const calculateFinancialHealthMath = (currentBalance, transactions) => {
    // 1. Normalização e Agregação (Últimos 3 meses baseados nos dados recebidos)
    let income = 0;
    let expense = 0;
    let fixedExpense = 0;
    let debts = 0;
    transactions.forEach(tx => {
        const amount = Number(tx.amount || 0);
        // Normalização de Type: aceita "Income", "credit", "receita" vs "Expense", "debit", "despesa"
        const typeLower = (tx.type || '').toLowerCase();
        const isIncome = typeLower === 'income' || typeLower === 'credit' || typeLower === 'receita' || amount > 0; // Fallback pelo sinal se type for ambíguo
        // Garantir valor absoluto para somas
        const absAmount = Math.abs(amount);
        if (isIncome) {
            income += absAmount;
        }
        else {
            expense += absAmount;
            // Detecção heurística de fixos/dívidas baseada em subType ou categoria
            const subType = (tx.subType || '').toLowerCase();
            if (subType.includes('fixa') || subType.includes('aluguel') || subType.includes('salário')) {
                fixedExpense += absAmount;
            }
            if (subType.includes('crédito') || subType.includes('empréstimo')) {
                debts += absAmount;
            }
        }
    });
    // Evita divisão por zero
    const safeIncome = income || 1;
    // 2. Cálculo de KPIs
    const netCashFlow = income - expense;
    const avgBurnRate = expense / 3; // Assumindo window de 3 meses dos dados
    // Runway: Se gastar 0, runway é "infinito" (99 meses)
    const runwayMonths = avgBurnRate > 0 ? currentBalance / avgBurnRate : 99;
    // Ratios (Lógica original do seu projeto preservada e tipada)
    const cashFlowRatio = (income - expense) / safeIncome;
    const marginRatio = 1 - (fixedExpense / safeIncome);
    const debtRatio = 1 - (debts / safeIncome);
    // 3. Score Ponderado (Lógica Híbrida: Sua original + Minha sugestão de Runway)
    // Pesos: Runway (40%), Fluxo (30%), Margem (15%), Dívida (15%)
    let score = 0;
    // Fator Runway (Novo)
    if (runwayMonths >= 12)
        score += 40;
    else if (runwayMonths >= 6)
        score += 30;
    else if (runwayMonths >= 3)
        score += 15;
    else
        score += 0;
    // Fator Fluxo de Caixa (Original adaptado)
    const fluxoScore = Math.max(0, cashFlowRatio) * 30; // Max 30 pts
    score += fluxoScore;
    // Fator Margem & Dívida (Original adaptado)
    const margemScore = Math.max(0, marginRatio) * 15;
    const dividaScore = Math.max(0, debtRatio) * 15;
    score += margemScore + dividaScore;
    // Clamp 0-100
    score = Math.min(100, Math.round(score));
    // 4. Status
    let status = 'DANGER';
    if (score >= 80)
        status = 'EXCELLENT';
    else if (score >= 60)
        status = 'STABLE';
    else if (score >= 30)
        status = 'CRITICAL';
    return {
        score,
        status,
        runwayMonths,
        avgBurnRate,
        netCashFlow,
        metrics: { cashFlowRatio, marginRatio, debtRatio }
    };
};
exports.calculateFinancialHealthMath = calculateFinancialHealthMath;
