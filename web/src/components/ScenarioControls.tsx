import React from "react";
import { GlassPanel } from "./ui/GlassPanel";

type ScenarioControlsProps = {
  occupancyDelta: number;
  priceDelta: number;
  expenseDelta: number;
  onChange: (values: { occupancyDelta?: number; priceDelta?: number; expenseDelta?: number }) => void;
  onReset: () => void;
};

function formatPct(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(0)}%`;
}

export function ScenarioControls({
  occupancyDelta,
  priceDelta,
  expenseDelta,
  onChange,
  onReset,
}: ScenarioControlsProps) {
  const sliders = [
    {
      label: "Ocupação",
      value: occupancyDelta,
      onChange: (v: number) => onChange({ occupancyDelta: v }),
    },
    {
      label: "Preço Médio (Diária)",
      value: priceDelta,
      onChange: (v: number) => onChange({ priceDelta: v }),
    },
    {
      label: "Despesas Operacionais",
      value: expenseDelta,
      onChange: (v: number) => onChange({ expenseDelta: v }),
    },
  ];

  return (
    <GlassPanel className="p-5 space-y-5 backdrop-blur-xl border border-white/10 bg-white/50 dark:bg-slate-900/50">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Simulação</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Ajuste os deslizadores para testar hipóteses.</p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200 hover:border-primary hover:text-primary transition-colors"
        >
          Resetar Simulação
        </button>
      </div>

      <div className="space-y-4">
        {sliders.map((slider) => (
          <div key={slider.label} className="space-y-2">
            <div className="flex items-center justify-between text-sm font-medium text-slate-800 dark:text-slate-100">
              <span>{slider.label}</span>
              <span className="text-primary">{formatPct(slider.value)}</span>
            </div>
            <input
              type="range"
              min={-50}
              max={50}
              value={slider.value}
              onChange={(e) => slider.onChange(Number(e.target.value))}
              className="w-full accent-primary h-2 rounded-full bg-slate-200 dark:bg-slate-800 appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-lg"
            />
            <div className="flex justify-between text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
              <span>-50%</span>
              <span>0%</span>
              <span>+50%</span>
            </div>
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}
