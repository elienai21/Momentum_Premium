import React, { useState } from "react";
import { useTenant } from "../context/TenantContext";
import { usePulseSummary } from "../hooks/usePulseSummary";
import { ScenarioControls } from "../components/ScenarioControls";
import { ScenarioResult } from "../components/ScenarioResult";
import { SectionHeader } from "../components/ui/SectionHeader";

const CfoSimulation: React.FC = () => {
    const { tenantId } = useTenant();

    // Default to current month for data context using native JS
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 1-indexed
    const periodStart = `${year}-${String(month).padStart(2, '0')}-01`;
    // Simple end of month calculation approx or actual
    const lastDay = new Date(year, month, 0).getDate();
    const periodEnd = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

    const { data, loading } = usePulseSummary({
        tenantId: tenantId || "",
        periodStart,
        periodEnd,
    });

    // State for sliders
    const [occupancy, setOccupancy] = useState(0);
    const [price, setPrice] = useState(0);
    const [expenses, setExpenses] = useState(0);

    const handleReset = () => {
        setOccupancy(0);
        setPrice(0);
        setExpenses(0);
    };

    // Fallback defaults for Cold Start / Loading to allow UI testing
    const baseRevenue = data?.kpis?.revenueMonth || 10000;
    const baseExpenses = data?.kpis?.expenseMonth || 5000;

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <SectionHeader
                title="Simulador de Cenários & Stress Test"
                subtitle="Ferramenta de análise preditiva para projeção de resultados baseada em variações de mercado."
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Controls (4 cols) */}
                <div className="lg:col-span-4">
                    <ScenarioControls
                        occupancy={occupancy}
                        setOccupancy={setOccupancy}
                        price={price}
                        setPrice={setPrice}
                        expenses={expenses}
                        setExpenses={setExpenses}
                        onReset={handleReset}
                    />
                </div>

                {/* Right Column: Results (8 cols) */}
                <div className="lg:col-span-8">
                    <div className="mb-4 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/50 p-2 px-4 rounded-full w-fit">
                        <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                        <span>Dados base do mês atual ({month.toString().padStart(2, '0')}/{year})</span>
                    </div>

                    <ScenarioResult
                        baseRevenue={baseRevenue}
                        baseExpenses={baseExpenses}
                        varOccupancy={occupancy}
                        varPrice={price}
                        varExpenses={expenses}
                    />
                </div>
            </div>
        </div>
    );
};

export default CfoSimulation;
