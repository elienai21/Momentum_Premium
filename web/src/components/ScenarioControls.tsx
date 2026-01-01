import React from "react";
import { GlassPanel } from "./ui/GlassPanel";
import { RotateCcw } from "lucide-react";

interface ScenarioControlsProps {
    occupancy: number;
    setOccupancy: (val: number) => void;
    price: number;
    setPrice: (val: number) => void;
    expenses: number;
    setExpenses: (val: number) => void;
    onReset: () => void;
}

export const ScenarioControls: React.FC<ScenarioControlsProps> = ({
    occupancy,
    setOccupancy,
    price,
    setPrice,
    expenses,
    setExpenses,
    onReset,
}) => {
    const renderSlider = (
        label: string,
        value: number,
        setValue: (val: number) => void,
        colorClass: string
    ) => (
        <div className="mb-6 last:mb-0">
            <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {label}
                </label>
                <span
                    className={`text-sm font-bold ${value > 0
                            ? "text-emerald-500"
                            : value < 0
                                ? "text-rose-500"
                                : "text-slate-400"
                        }`}
                >
                    {value > 0 ? "+" : ""}
                    {value}%
                </span>
            </div>
            <input
                type="range"
                min="-50"
                max="50"
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
                className={`w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-200 dark:bg-slate-700 accent-${colorClass}-500 hover:accent-${colorClass}-400 transition-all`}
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                <span>-50%</span>
                <span>0%</span>
                <span>+50%</span>
            </div>
        </div>
    );

    return (
        <GlassPanel className="p-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <span className="material-symbols-outlined">tune</span>
                    Parâmetros
                </h3>
                <button
                    onClick={onReset}
                    className="text-xs text-slate-500 hover:text-primary flex items-center gap-1 transition-colors"
                    title="Resetar todos os parâmetros"
                >
                    <RotateCcw size={14} />
                    Resetar
                </button>
            </div>

            <div className="flex-1">
                {renderSlider("Variação de Ocupação", occupancy, setOccupancy, "indigo")}
                {renderSlider("Variação de Preço Médio", price, setPrice, "emerald")}
                {renderSlider("Variação de Despesas", expenses, setExpenses, "rose")}
            </div>

            <div className="mt-6 p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-800">
                <p className="text-xs text-blue-600 dark:text-blue-300 flex items-start gap-2">
                    <span className="material-symbols-outlined text-sm">info</span>
                    Simule cenários ajustando os sliders acima. O resultado é calculado instantaneamente.
                </p>
            </div>
        </GlassPanel>
    );
};
