// web/src/components/MomentumPulse.tsx
import { PulseSummary } from "../services/pulseApi";
import KpiCard from "./KpiCard";
import { KpiSkeleton } from "./skeletons/KpiSkeleton";
import { EmptyState } from "./ui/EmptyState";
import { getFriendlyError } from "../lib/errorMessages";

interface MomentumPulseProps {
  data: PulseSummary | null;
  loading: boolean;
  error: unknown | null;
  empty: boolean;
  onOpenAdvisor?: () => void;
  onSimulate?: () => void;
  onImportClick?: () => void;
}

export default function MomentumPulse({
  data,
  loading,
  error,
  empty,
  onOpenAdvisor,
  onSimulate,
  onImportClick,
}: MomentumPulseProps) {
  // LOADING → skeletons consistentes
  if (loading) {
    return (
      <section className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <KpiSkeleton key={i} />
          ))}
        </div>
      </section>
    );
  }

  // ERRO REAL (HTTP ≥ 400 / rede)
  // erro real (400-499 exceto 404, 500, rede)
  if (error) {
    const friendly = getFriendlyError(error);

    return (
      <section className="space-y-3">
        <EmptyState
          title={friendly.title}
          description={friendly.message}
          actionLabel={friendly.ctaLabel}
          onActionClick={
            friendly.ctaHref
              ? () => (window.location.href = friendly.ctaHref!)
              : undefined
          }
          icon={"⚠️"}
          variant="subtle"
        />
      </section>
    );
  }


  // EMPTY (200/204, mas sem dados)
  if (empty || !data) {
    return (
      <section className="space-y-4">
        <EmptyState
          title="Seu Pulse ainda está em branco"
          description="Ainda não temos dados financeiros suficientes para gerar seu Pulse. Importe suas transações para começar a enxergar o momento da sua empresa."
          actionLabel="Importar agora"
          onActionClick={onImportClick}
          icon={"📊"}
        />

        {/* Mantém a área do gráfico / layout para não “sumir” visualmente */}
        <div className="mt-2 text-xs text-slate-500">
          Assim que seus dados forem importados e processados, você verá aqui
          KPIs, gráficos de caixa, receita, despesas e runway.
        </div>
      </section>
    );
  }

  // DATA → render normal
  const { kpis } = data;

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard label="Saldo em caixa" value={kpis.cashBalance} />
        <KpiCard label="Receita do mês" value={kpis.revenueMonth} />
        <KpiCard label="Despesas do mês" value={kpis.expenseMonth} />
        <KpiCard
          label="Runway (meses)"
          value={kpis.runwayMonths}
          suffix="m"
        />
      </div>

      <div className="flex flex-wrap justify-end gap-2 text-xs">
        {onSimulate && (
          <button
            type="button"
            onClick={onSimulate}
            className="rounded-xl border px-3 py-2 hover:bg-slate-50"
          >
            Simular cenário
          </button>
        )}
        {onOpenAdvisor && (
          <button
            type="button"
            onClick={onOpenAdvisor}
            className="rounded-xl border px-3 py-2 hover:bg-slate-50"
          >
            Perguntar ao Advisor
          </button>
        )}
      </div>
    </section>
  );
}
