import React from "react";
import { GlassPanel } from "./ui/GlassPanel";
import { StatsCard } from "./ui/StatsCard";
import { Wallet, TrendingUp, TrendingDown, DollarSign } from "lucide-react";

interface ScenarioResultProps {
    baseRevenue: number;
    baseExpenses: number;
    varOccupancy: number; // Percentage as number (e.g., 20 for 20%)
    varPrice: number;
    varExpenses: number;
}

export const ScenarioResult: React.FC<ScenarioResultProps> = ({
    baseRevenue,
    baseExpenses,
    varOccupancy,
    varPrice,
    varExpenses,
}) => {
    // Logic simplified as per request for MVP
    // Occupancy and Price effects are additive on revenue for simplicity in this MVP version
    // revenue multiplier = 1 + (occ% + price%)
    const revenueMultiplier = 1 + (varOccupancy / 100) + (varPrice / 100);
    const expenseMultiplier = 1 + (varExpenses / 100);

    const newRevenue = baseRevenue * revenueMultiplier;
    const newExpenses = baseExpenses * expenseMultiplier;
    const baseProfit = baseRevenue - baseExpenses;
    const newProfit = newRevenue - newExpenses;

    const profitDiff = newProfit - baseProfit;
    const isLossRisk = newProfit < 0;

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(val);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatsCard
                    label="Receita Projetada"
                    value={formatCurrency(newRevenue)}
                    trend={
                        newRevenue > baseRevenue
                            ? { value: "vs atual", direction: "up" }
                            : newRevenue < baseRevenue
                                ? { value: "vs atual", direction: "down" }
                                : undefined
                    }
                    icon={DollarSign}
                    variant="success"
                />
                <StatsCard
                    label="Despesa Projetada"
                    value={formatCurrency(newExpenses)}
                    trend={
                        newExpenses > baseExpenses
                            ? { value: "vs atual", direction: "up" } // Expenses UP is visually red (danger) usually, handled by variant below if needed, but StatsCard uses direction for trend color too.
                            : newExpenses < baseExpenses
                                ? { value: "vs atual", direction: "down" }
                                : undefined
                    }
                    icon={TrendingDown}
                    variant="danger"
                />
                <StatsCard
                    label="Lucro Operacional"
                    value={formatCurrency(newProfit)}
                    trend={
                        newProfit > baseProfit
                            ? { value: "vs atual", direction: "up" }
                            : newProfit < baseProfit
                                ? { value: "vs atual", direction: "down" }
                                : undefined
                    }
                    icon={Wallet}
                    variant={newProfit >= 0 ? "success" : "danger"}
                    className={isLossRisk ? "border-rose-500 ring-1 ring-rose-500/50" : ""}
                />
            </div>

            {isLossRisk && (
                <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg flex items-center gap-3 animate-pulse">
                    <span className="material-symbols-outlined text-rose-600 dark:text-rose-400">warning</span>
                    <div>
                        <h4 className="font-bold text-rose-700 dark:text-rose-300 text-sm">Risco de Prejuízo Operacional</h4>
                        <p className="text-xs text-rose-600 dark:text-rose-400">Os parâmetros atuais indicam uma operação deficitária.</p>
                    </div>
                </div>
            )}

            <GlassPanel className="p-6">
                <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Análise de Sensibilidade</h4>

                <div className="flex items-center justify-between text-sm py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-300">Lucro Atual (Base)</span>
                    <span className="font-mono text-slate-500">{formatCurrency(baseProfit)}</span>
                </div>
                <div className="flex items-center justify-between text-sm py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-300">Impacto da Simulação</span>
                    <span className={`font-mono font-bold ${profitDiff >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {profitDiff > 0 ? "+" : ""}{formatCurrency(profitDiff)}
                    </span>
                </div>
                <div className="flex items-center justify-between text-lg py-3 font-bold">
                    <span className="text-slate-800 dark:text-white">Resultado Final</span>
                    <span className={newProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                        {formatCurrency(newProfit)}
                    </span>
                </div>
            </GlassPanel>
        </div>
    );
};
