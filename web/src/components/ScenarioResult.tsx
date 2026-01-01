import React, { useMemo } from "react";
import { GlassPanel } from "./ui/GlassPanel";
import { Badge } from "./ui/Badge";

type ScenarioResultProps = {
  occupancyDelta: number;
  priceDelta: number;
  expenseDelta: number;
  revenue: number;
  expense: number;
};

const fmtMoney = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export function ScenarioResult({
  occupancyDelta,
  priceDelta,
  expenseDelta,
  revenue,
  expense,
}: ScenarioResultProps) {
  const { newRevenue, newExpense, newProfit, currentProfit } = useMemo(() => {
    const revMultiplier = 1 + (occupancyDelta + priceDelta) / 100;
    const expMultiplier = 1 + expenseDelta / 100;
    const newRevenueCalc = revenue * revMultiplier;
    const newExpenseCalc = expense * expMultiplier;
    const profitCalc = newRevenueCalc - newExpenseCalc;
    const currentProfitCalc = revenue - expense;

    return {
      newRevenue: newRevenueCalc,
      newExpense: newExpenseCalc,
      newProfit: profitCalc,
      currentProfit: currentProfitCalc,
    };
  }, [occupancyDelta, priceDelta, expenseDelta, revenue, expense]);

  const cards = [
    {
      title: "Receita Projetada",
      value: newRevenue,
      base: revenue,
      color: "text-emerald-500",
    },
    {
      title: "Despesas Projetadas",
      value: newExpense,
      base: expense,
      color: "text-amber-500",
    },
    {
      title: "Lucro Líquido",
      value: newProfit,
      base: currentProfit,
      color: newProfit >= 0 ? "text-emerald-500" : "text-rose-500",
    },
  ];

  const maxValue = Math.max(revenue, expense, newRevenue, newExpense, 1);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((card) => {
          const delta = card.value - card.base;
          const deltaLabel = `${delta >= 0 ? "+" : ""}${fmtMoney(delta)}`;
          const isPositive = delta >= 0;

          return (
            <GlassPanel
              key={card.title}
              className="p-4 border border-white/10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl"
            >
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {card.title}
              </p>
              <p className="text-2xl font-semibold text-slate-900 dark:text-white mt-1">
                {fmtMoney(card.value)}
              </p>
              <p className={`text-sm mt-1 ${isPositive ? "text-emerald-500" : "text-rose-500"}`}>
                {deltaLabel} vs. atual
              </p>
            </GlassPanel>
          );
        })}
      </div>

      <GlassPanel className="p-4 border border-white/10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Comparativo</h3>
          {newProfit < 0 && (
            <Badge variant="warn">⚠️ Risco de Prejuízo Operacional</Badge>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <BarRow label="Receita Atual" value={revenue} max={maxValue} color="bg-emerald-500" />
          <BarRow
            label="Receita Simulada"
            value={newRevenue}
            max={maxValue}
            color="bg-emerald-400"
          />
          <BarRow label="Despesa Atual" value={expense} max={maxValue} color="bg-amber-500" />
          <BarRow
            label="Despesa Simulada"
            value={newExpense}
            max={maxValue}
            color="bg-amber-400"
          />
          <BarRow
            label="Lucro Atual"
            value={currentProfit}
            max={maxValue}
            color="bg-slate-500"
          />
          <BarRow
            label="Lucro Simulado"
            value={newProfit}
            max={maxValue}
            color={newProfit >= 0 ? "bg-emerald-500" : "bg-rose-500"}
          />
        </div>
      </GlassPanel>
    </div>
  );
}

type BarRowProps = {
  label: string;
  value: number;
  max: number;
  color: string;
};

function BarRow({ label, value, max, color }: BarRowProps) {
  const widthPct = Math.min(100, Math.max(0, (Math.abs(value) / max) * 100));
  const isNegative = value < 0;

  return (
    <div>
      <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 mb-1">
        <span>{label}</span>
        <span className={isNegative ? "text-rose-500" : "text-emerald-500"}>
          {fmtMoney(value)}
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
        <div
          className={`h-full ${color} transition-all`}
          style={{ width: `${widthPct}%`, transformOrigin: "left" }}
        />
      </div>
    </div>
  );
}
