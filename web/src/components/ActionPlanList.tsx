// web/src/components/ActionPlanList.tsx
import type { CfoAction } from "../hooks/useCfoSummary";

interface Props {
  loading: boolean;
  error: string | null;
  empty: boolean;
  actions: CfoAction[] | undefined;
}

export default function ActionPlanList({
  loading,
  error,
  empty,
  actions,
}: Props) {
  if (loading) {
    return (
      <div className="p-6 bg-white rounded-xl shadow-sm border">
        <div className="h-4 w-28 bg-gray-200 rounded mb-4 animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-10 bg-gray-200 rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
        Não consegui carregar o plano de ações. Recarregue a página. Se
        persistir, fale com o suporte.
      </div>
    );
  }

  if (empty || !actions || actions.length === 0) {
    return (
      <div className="p-6 bg-white rounded-xl shadow-sm border text-sm text-gray-600">
        Nenhum plano de ação financeiro definido ainda. Assim que o Advisor
        gerar recomendações, elas aparecerão aqui.
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border">
      <div className="text-sm text-gray-500 mb-3">Plano de Ações</div>
      <ul className="space-y-2">
        {actions.map((action, idx) => (
          <li
            key={action.id ?? idx}
            className="flex items-start justify-between gap-3 rounded-lg border px-3 py-2"
          >
            <div>
              <div className="text-sm font-medium text-gray-900">
                {action.title}
              </div>
              {action.description && (
                <div className="text-xs text-gray-600 mt-1">
                  {action.description}
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              {action.impact && (
                <span className="text-[10px] px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                  Impacto: {action.impact}
                </span>
              )}
              {action.status && (
                <span className="text-[10px] px-2 py-1 rounded-full bg-slate-50 text-slate-700 border border-slate-200">
                  {action.status}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
