// web/src/components/ScenarioPreview.tsx
import type { CfoKpi, CfoScenario } from "../hooks/useCfoSummary";

interface Props {
  loading: boolean;
  error: string | null;
  empty: boolean;
  kpis: CfoKpi[] | undefined;
  scenarios: CfoScenario[] | undefined;
}

export default function ScenarioPreview({
  loading,
  error,
  empty,
  kpis,
  scenarios,
}: Props) {
  if (loading) {
    return (
      <div className="p-6 bg-white rounded-xl shadow-sm border">
        <div className="h-4 w-32 bg-gray-200 rounded mb-4 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 bg-gray-200 rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
        Não consegui carregar os cenários simulados. Tente novamente mais
        tarde.
      </div>
    );
  }

  if (empty || !scenarios || scenarios.length === 0) {
    return (
      <div className="p-6 bg-white rounded-xl shadow-sm border text-sm text-gray-600">
        Nenhum cenário financeiro simulador disponível ainda. Use o Advisor ou
        o simulador para gerar hipóteses.
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">Cenários simulados</div>
        {kpis && kpis.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {kpis.slice(0, 3).map((kpi, idx) => (
              <span
                key={kpi.id ?? idx}
                className="text-[11px] px-2 py-1 rounded-full bg-slate-50 text-slate-700 border border-slate-200"
              >
                {kpi.name}: {kpi.value}
                {kpi.unit && <span className="ml-1">{kpi.unit}</span>}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {scenarios.map((sc, idx) => (
          <div
            key={sc.id ?? idx}
            className="rounded-lg border p-3 text-sm flex flex-col gap-2"
          >
            <div className="font-medium text-gray-900">{sc.title}</div>
            {sc.description && (
              <div className="text-xs text-gray-600">{sc.description}</div>
            )}
            {sc.impact && (
              <span className="text-[11px] px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 self-start">
                Impacto: {sc.impact}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
