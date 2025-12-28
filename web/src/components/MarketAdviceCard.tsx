import { useId } from "react";
import { AlertCircle, Loader2, RefreshCw, Settings } from "lucide-react";
import type { MarketAdviceResponse } from "../hooks/useMarketAdvice";

export interface MarketAdviceCardProps {
  advice: MarketAdviceResponse | null;
  isLoading: boolean;
  error: Error | null;
  noCredits: boolean;
  onRefetch?: () => void;

  /** Novo: quando o back indicar que o conselheiro de mercado está desativado */
  marketDisabled?: boolean;
  /** Novo: callback para abrir a tela de configuração (ex.: navigate("/admin/market")) */
  onOpenConfig?: () => void;
}

export function MarketAdviceCard({
  advice,
  isLoading,
  error,
  noCredits,
  onRefetch,
  marketDisabled,
  onOpenConfig,
}: MarketAdviceCardProps) {
  const headingId = useId();
  const disclaimerId = useId();

  // Heurística de compatibilidade: se ainda não passar 'marketDisabled',
  // detecta pelo conteúdo do erro retornado pelo back-end.
  const disabledByError =
    !marketDisabled &&
    !!error &&
    /MARKET_DISABLED|market.*disabled|conselheiro.*desativado/i.test(error.message || "");

  const isDisabled = marketDisabled || disabledByError;

  // LOADING
  if (isLoading) {
    return (
      <section
        className="rounded-2xl border bg-white p-4 shadow-sm animate-pulse space-y-3"
        role="status"
        aria-busy="true"
        aria-live="polite"
        aria-labelledby={headingId}
      >
        <div id={headingId} className="h-4 w-40 bg-slate-200 rounded" />
        <div className="h-3 w-72 bg-slate-100 rounded" />
        <div className="h-3 w-full bg-slate-100 rounded" />
        <div className="h-3 w-2/3 bg-slate-100 rounded" />
      </section>
    );
  }

  // DESATIVADO NO TENANT
  if (isDisabled) {
    return (
      <section
        className="rounded-2xl border border-sky-200 bg-sky-50 p-4 shadow-sm"
        role="region"
        aria-labelledby={headingId}
        aria-describedby={disclaimerId}
      >
        <div className="flex items-start gap-2">
          <Settings className="h-5 w-5 text-sky-700 mt-[2px]" aria-hidden="true" />
          <div className="space-y-1 text-sm text-sky-900">
            <h3 id={headingId} className="font-semibold">
              Conselheiro de mercado desativado para este tenant
            </h3>
            <p>
              Ative o conselheiro de mercado nas configurações do tenant para gerar a
              análise com base no seu setor, região e porte.
            </p>
            <div className="flex gap-2 mt-1">
              {onOpenConfig ? (
                <button
                  onClick={onOpenConfig}
                  className="inline-flex items-center gap-1 rounded-xl border border-sky-300 bg-white px-3 py-1.5 text-xs font-medium text-sky-800 hover:bg-sky-100"
                >
                  <Settings className="h-3 w-3" aria-hidden="true" />
                  Abrir configuração
                </button>
              ) : (
                // Fallback seguro caso a tela ainda não injete um handler:
                <a
                  href="/admin/market"
                  className="inline-flex items-center gap-1 rounded-xl border border-sky-300 bg-white px-3 py-1.5 text-xs font-medium text-sky-800 hover:bg-sky-100"
                >
                  <Settings className="h-3 w-3" aria-hidden="true" />
                  Abrir configuração
                </a>
              )}
              {onRefetch && (
                <button
                  onClick={onRefetch}
                  className="inline-flex items-center gap-1 rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-800 hover:bg-sky-100"
                >
                  <RefreshCw className="h-3 w-3" aria-hidden="true" />
                  Tentar novamente
                </button>
              )}
            </div>
          </div>
        </div>
        <p id={disclaimerId} className="mt-3 text-[11px] text-sky-800/80">
          Esta análise usa padrões históricos e sinais de mercado com base no seu perfil.
        </p>
      </section>
    );
  }

  // SEM CRÉDITOS
  if (noCredits) {
    return (
      <section
        className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm"
        role="region"
        aria-labelledby={headingId}
        aria-describedby={disclaimerId}
      >
        <div className="flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-amber-700 mt-[2px]" aria-hidden="true" />
          <div className="space-y-1 text-sm text-amber-900">
            <h3 id={headingId} className="font-semibold">
              Créditos de IA para análises de mercado esgotados
            </h3>
            <p>
              Você atingiu o limite de créditos de IA para análises de mercado neste
              plano. Atualize seu plano ou aguarde a renovação dos créditos para
              continuar usando este recurso.
            </p>
            {onRefetch && (
              <button
                onClick={onRefetch}
                className="inline-flex items-center gap-1 rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 mt-1"
              >
                <RefreshCw className="h-3 w-3" aria-hidden="true" />
                Tentar novamente depois
              </button>
            )}
          </div>
        </div>
        <p id={disclaimerId} className="mt-3 text-[11px] text-amber-800/80">
          Esta análise é baseada em padrões históricos de mercado e comportamento do
          consumidor. Não constitui garantia de resultados futuros.
        </p>
      </section>
    );
  }

  // ERRO GENÉRICO
  if (error) {
    return (
      <section
        className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm"
        role="region"
        aria-labelledby={headingId}
        aria-describedby={disclaimerId}
      >
        <div className="flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-red-700 mt-[2px]" aria-hidden="true" />
          <div className="space-y-1 text-sm text-red-900">
            <h3 id={headingId} className="font-semibold">
              Não foi possível obter a análise de mercado
            </h3>
            <p>Não foi possível obter a análise de mercado agora. Tente novamente mais tarde.</p>
            {onRefetch && (
              <button
                onClick={onRefetch}
                className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-100 mt-1"
                aria-label="Tentar atualizar a análise de mercado"
              >
                <RefreshCw className="h-3 w-3" aria-hidden="true" />
                Tentar novamente
              </button>
            )}
          </div>
        </div>
        <p id={disclaimerId} className="mt-3 text-[11px] text-red-800/80">
          Esta análise é baseada em padrões históricos de mercado e comportamento do
          consumidor. Não constitui garantia de resultados futuros.
        </p>
      </section>
    );
  }

  // EMPTY (nenhuma análise ainda)
  if (!advice) {
    return (
      <section
        className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm"
        role="region"
        aria-labelledby={headingId}
        aria-describedby={disclaimerId}
      >
        <h3 id={headingId} className="text-sm font-semibold text-slate-800 mb-1">
          Visão Estratégica de Mercado
        </h3>
        <p className="text-xs text-slate-600 mb-3">
          Peça ao seu CFO virtual uma visão de mercado com base no seu segmento. Isso
          ajuda a tomar decisões mais alinhadas com o cenário real, usando padrões
          históricos e comportamento de consumidor.
        </p>
        {onRefetch && (
          <button
            onClick={onRefetch}
            className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-black"
            aria-label="Gerar análise de mercado"
          >
            <Loader2 className="h-3 w-3" aria-hidden="true" />
            Gerar análise de mercado
          </button>
        )}
        <p id={disclaimerId} className="mt-3 text-[11px] text-slate-500">
          Esta análise é baseada em padrões históricos de mercado e comportamento do
          consumidor. Não constitui garantia de resultados futuros.
        </p>
      </section>
    );
  }

  // COM DADOS
  const {
    summary,
    marketFacts,
    historicalPatterns,
    risks,
    opportunities,
    consumerBehaviorInsights,
    recommendedActions,
  } = advice;

  const hasConsumerInsights = consumerBehaviorInsights?.length > 0;

  return (
    <section
      className="rounded-2xl border bg-white p-4 shadow-sm space-y-3"
      role="region"
      aria-labelledby={headingId}
      aria-describedby={disclaimerId}
    >
      <div>
        <h3 id={headingId} className="text-sm font-semibold text-slate-800">
          Visão Estratégica de Mercado
        </h3>
        {summary && (
          <p className="mt-1 text-xs text-slate-600 leading-relaxed">{summary}</p>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {marketFacts?.length > 0 && (
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-slate-700">
              Fatos de mercado relevantes
            </h4>
            <ul className="space-y-1 text-xs text-slate-600">
              {marketFacts.map((item, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-slate-300" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {historicalPatterns?.length > 0 && (
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-slate-700">
              Padrões históricos observados
            </h4>
            <ul className="space-y-1 text-xs text-slate-600">
              {historicalPatterns.map((item, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-slate-300" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {risks?.length > 0 && (
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-rose-700">
              Riscos suportados por dados
            </h4>
            <ul className="space-y-1 text-xs text-rose-800">
              {risks.map((item, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-rose-300" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {opportunities?.length > 0 && (
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-emerald-700">
              Oportunidades identificadas
            </h4>
            <ul className="space-y-1 text-xs text-emerald-800">
              {opportunities.map((item, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {hasConsumerInsights && (
          <div className="space-y-1 md:col-span-2">
            <h4 className="text-xs font-semibold text-slate-700">
              Insights de comportamento de massa
            </h4>
            <ul className="space-y-1 text-xs text-slate-600">
              {consumerBehaviorInsights.map((item, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-slate-300" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {recommendedActions?.length > 0 && (
          <div className="space-y-1 md:col-span-2">
            <h4 className="text-xs font-semibold text-slate-900">
              Ações recomendadas (baseadas em padrões históricos)
            </h4>
            <ul className="space-y-1 text-xs text-slate-700">
              {recommendedActions.map((item, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-slate-900" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-1">
        <p id={disclaimerId} className="text-[11px] text-slate-500">
          Esta análise é baseada em padrões históricos de mercado e comportamento do
          consumidor. Não constitui garantia de resultados futuros.
        </p>
        {onRefetch && (
          <button
            onClick={onRefetch}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
            aria-label="Atualizar análise de mercado"
          >
            <RefreshCw className="h-3 w-3" aria-hidden="true" />
            Atualizar análise
          </button>
        )}
      </div>
    </section>
  );
}
