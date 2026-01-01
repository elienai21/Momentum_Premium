import React, { useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import { ScenarioControls } from "../components/ScenarioControls";
import { ScenarioResult } from "../components/ScenarioResult";
import { GlassPanel } from "../components/ui/GlassPanel";
import { useTenant as useTenantContext } from "../context/TenantContext";
import { usePulseSummary } from "../hooks/usePulseSummary";
import { SectionHeader } from "../components/ui/SectionHeader";

function getCurrentPeriodRange() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
  const end = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0));
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(end) };
}

export default function CfoSimulation() {
  const { tenantId } = useTenantContext();
  const { start, end } = useMemo(() => getCurrentPeriodRange(), []);
  const { data, loading, empty } = usePulseSummary({
    tenantId: tenantId || "",
    periodStart: start,
    periodEnd: end,
  });

  const [deltas, setDeltas] = useState({
    occupancyDelta: 0,
    priceDelta: 0,
    expenseDelta: 0,
  });

  const baseRevenue =
    empty || !data ? 10000 : data.kpis?.revenueMonth ?? 0;
  const baseExpense =
    empty || !data ? 5000 : data.kpis?.expenseMonth ?? 0;

  const handleChange = (values: Partial<typeof deltas>) =>
    setDeltas((prev) => ({ ...prev, ...values }));

  const handleReset = () =>
    setDeltas({
      occupancyDelta: 0,
      priceDelta: 0,
      expenseDelta: 0,
    });

  return (
    <div className="space-y-6 pb-16">
      <SectionHeader
        title={
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            <span>Simulador de Cenários &amp; Stress Test</span>
          </div>
        }
        subtitle="Arraste os controles para testar hipóteses sem aguardar o backend."
      />

      {loading && (
        <GlassPanel className="p-4 border border-white/10 bg-white/50 dark:bg-slate-900/50 text-sm text-slate-600 dark:text-slate-300">
          Carregando dados do mês atual...
        </GlassPanel>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ScenarioControls
          occupancyDelta={deltas.occupancyDelta}
          priceDelta={deltas.priceDelta}
          expenseDelta={deltas.expenseDelta}
          onChange={handleChange}
          onReset={handleReset}
        />

        <ScenarioResult
          occupancyDelta={deltas.occupancyDelta}
          priceDelta={deltas.priceDelta}
          expenseDelta={deltas.expenseDelta}
          revenue={baseRevenue}
          expense={baseExpense}
        />
      </div>
    </div>
  );
}
