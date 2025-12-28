import { usePulseSummary } from "../../hooks/usePulseSummary";
import KpiCard from "../../components/KpiCard";
import { KpiSkeleton } from "../../components/skeletons/KpiSkeleton";
import { EmptyState } from "../../components/EmptyState";
import { getFriendlyError } from "../../lib/errorMessages";

interface PulseSectionProps {
  onImportClick: () => void;
}

export default function PulseSection({ onImportClick }: PulseSectionProps) {
  const { data, loading, error } = usePulseSummary(/* seus params */);

  // LOADING -> skeleton consistente
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <KpiSkeleton key={i} />
        ))}
      </div>
    );
  }

  // ERRO -> mensagem amigável + possível CTA
  if (error) {
    const friendly = getFriendlyError(error);

    return (
      <EmptyState
        title={friendly.title}
        description={friendly.message}
        actionLabel={
          friendly.ctaLabel ||
          (friendly.title.includes("dados") ? "Importar agora" : undefined)
        }
        onActionClick={
          friendly.title.includes("dados") ? onImportClick : undefined
        }
        icon={"⚠️"}
      />
    );
  }

  // EMPTY -> sem dados, mas sem erro
  if (!data) {
    return (
      <EmptyState
        title="Nenhum dado financeiro ainda"
        description="Ainda não temos dados financeiros suficientes para gerar seu Pulse. Importe suas transações para começar."
        actionLabel="Importar agora"
        onActionClick={onImportClick}
        icon={"📥"}
      />
    );
  }

  // DATA -> KPIs reais
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <KpiCard label="Saldo em caixa" value={data.kpis.cashBalance} />
      <KpiCard label="Receita do mês" value={data.kpis.revenueMonth} />
      <KpiCard label="Despesas do mês" value={data.kpis.expenseMonth} />
      <KpiCard
        label="Runway (meses)"
        value={data.kpis.runwayMonths}
        suffix="m"
      />
    </div>
  );
}
