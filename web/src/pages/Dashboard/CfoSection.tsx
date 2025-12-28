// web/src/pages/Dashboard/CfoSection.tsx
//
// - Mantém HealthScore, Plano de Ação e Cenário de Mercado
// - Adiciona card de Relatório do CFO IA (CfoInsightsCard)
// - Mantém VoicePanel como camada de voz do CFO

import { useId, useState, KeyboardEvent } from "react";
import HealthScoreCard from "../../components/HealthScoreCard";
import ActionPlanList from "../../components/ActionPlanList";
import ScenarioPreview from "../../components/ScenarioPreview";
import VoicePanel from "../../components/VoicePanel";
import { CfoInsightsCard } from "../../components/CfoInsightsCard";
import { CardSkeleton } from "../../components/skeletons/CardSkeleton";
import { EmptyState } from "../../components/EmptyState";
import { getFriendlyError } from "../../lib/errorMessages";
import { useCfoSummary } from "../../hooks/useCfoSummary";
import { useMarketAdvice } from "../../hooks/useMarketAdvice";
import { MarketAdviceCard } from "../../components/MarketAdviceCard";

interface CfoSectionProps {
  onImportClick: () => void;
  tenantId: string;
  plan?: string;
  sector?: string;
  region?: string;
  companySize?: string;
}

export default function CfoSection({
  onImportClick,
  tenantId,
  plan = "CFO",
  sector,
  region,
  companySize,
}: CfoSectionProps) {
  const { data, isLoading, error, isEmpty } = useCfoSummary();

  const hasAnyData =
    !!data &&
    (!!data.healthScore || (data.actionPlan && data.actionPlan.length > 0));

  const [question, setQuestion] = useState("");
  const inputId = useId();
  const helpId = `${inputId}-help`;

  const {
    data: marketAdvice,
    isLoading: isMarketLoading,
    error: marketError,
    noCredits: marketNoCredits,
    refetch: refetchMarket,
  } = useMarketAdvice({
    question: question.trim() || undefined,
    enabled: hasAnyData,
  });

  const kpis = data?.kpis || [];
  const actionPlan = data?.actionPlan || [];

  const marketMeta = [
    sector ? { label: "Setor", value: sector } : null,
    region ? { label: "Região", value: region } : null,
    companySize ? { label: "Porte", value: companySize } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  function handleAsk() {
    refetchMarket();
  }

  function onQuestionKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAsk();
    }
  }

  if (isLoading) {
    return (
      <section className="mt-8 space-y-6" aria-busy="true" aria-live="polite">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <div>
              <div className="mb-2 h-5 w-48 rounded bg-slate-200" />
              <div className="h-4 w-64 rounded bg-slate-100" />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <CardSkeleton className="md:col-span-1 h-40" />
              <CardSkeleton className="md:col-span-2 h-40" />
            </div>
            <CardSkeleton className="h-40" />
          </div>
          <div className="space-y-4">
            <CardSkeleton className="h-20" />
            <CardSkeleton className="h-64" />
          </div>
        </div>
        <CardSkeleton className="h-40" />
      </section>
    );
  }

  
if (error) {
    const friendly = getFriendlyError(error);
    return (
      <section className="mt-8" aria-live="polite">
        <EmptyState
          title="N?o foi poss?vel carregar o painel do CFO"
          description={friendly.message}
          primaryActionLabel="Tentar novamente"
          onPrimaryAction={onImportClick}
        />
      </section>
    );
  }

  if (isEmpty || !hasAnyData) {
    return (
      <section className="mt-8 space-y-6" aria-live="polite">
        <EmptyState
          title="Seu painel do CFO ainda está vazio"
          description="Importe seus dados financeiros para ver saúde da empresa, plano de ação e simulações inteligentes."
          primaryActionLabel="Importar dados agora"
          onPrimaryAction={onImportClick}
        />

        {/* Mesmo sem dados, já mostramos o painel de voz como teaser de valor */}
        <VoicePanel tenantId={tenantId} plan={plan} />
      </section>
    );
  }

  return (
    <section
      className="mt-8 space-y-6"
      aria-labelledby="cfo-heading"
      aria-describedby="cfo-subheading"
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Bloco 1 — Saúde financeira da empresa + Relatório IA */}
        <div className="lg:col-span-2 space-y-4">
          <header className="space-y-1">
            <h2 id="cfo-heading" className="text-lg font-semibold text-slate-900">
              Saúde financeira da sua empresa
            </h2>
            <p id="cfo-subheading" className="text-sm text-slate-500">
              Acompanhe a fotografia interna do negócio: saúde, prioridades e
              impacto financeiro das ações sugeridas.
            </p>
          </header>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-1">
              <HealthScoreCard healthScore={data?.healthScore} />
            </div>
            <div className="md:col-span-2">
              <ActionPlanList actionPlan={actionPlan} />
            </div>
          </div>

          <div
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            role="region"
            aria-label="Impacto financeiro das próximas ações"
          >
            <h3 className="mb-2 text-sm font-semibold text-slate-900">
              Impacto financeiro das próximas ações
            </h3>
            <p className="mb-3 text-xs text-slate-500">
              Veja como o plano recomendado pelo CFO virtual afeta caixa, lucro e
              margem num cenário base.
            </p>
            <ScenarioPreview kpis={kpis} />
          </div>

          {/* Novo card: relatório textual do CFO IA */}
          <CfoInsightsCard />
        </div>

        {/* Bloco 2 — Cenário de mercado para o setor */}
        <aside
          className="space-y-3"
          role="complementary"
          aria-label="Cenário de mercado para o seu setor"
          aria-live="polite"
        >
          <header className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-900">
              Cenário de mercado para o seu setor
            </h2>
            <p className="text-sm text-slate-500">
              Seu CFO virtual conecta os números internos com fatos de mercado e
              padrões de comportamento do consumidor.
            </p>

            {marketMeta.length > 0 && (
              <dl className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-600">
                {marketMeta.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5"
                  >
                    <dt className="font-medium">{item.label}:</dt>
                    <dd>{item.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </header>

          {/* Pergunta opcional sobre o mercado */}
          <div
            className="space-y-1 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
            role="group"
            aria-labelledby={`${inputId}-label`}
            aria-describedby={helpId}
          >
            <label
              id={`${inputId}-label`}
              htmlFor={inputId}
              className="block text-[11px] font-medium uppercase tracking-wide text-slate-500"
            >
              Pergunta opcional sobre o mercado
            </label>
            <div className="mt-1 flex gap-2">
              <input
                id={inputId}
                type="text"
                placeholder="Ex.: Vale a pena expandir para outra cidade?"
                className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none ring-0 transition focus:border-sky-400 focus:bg-white focus:ring-1 focus:ring-sky-400"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={onQuestionKeyDown}
                aria-invalid={false}
                aria-describedby={helpId}
              />
              <button
                type="button"
                onClick={handleAsk}
                className="inline-flex items-center rounded-lg bg-sky-600 px-3 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500"
                disabled={isMarketLoading}
                aria-disabled={isMarketLoading}
                aria-busy={isMarketLoading}
                title="Gerar/atualizar análise de mercado"
              >
                {isMarketLoading ? "Atualizando..." : "Perguntar"}
              </button>
            </div>
            <p id={helpId} className="mt-1 text-[11px] text-slate-400">
              Use este campo para contextualizar a análise com dúvidas como
              expansão, novos canais ou mudanças de preço. Pressione Enter para
              enviar rapidamente.
            </p>
          </div>

          {/* Card de visão estratégica de mercado */}
          <MarketAdviceCard
            advice={marketAdvice}
            isLoading={isMarketLoading}
            error={marketError}
            noCredits={marketNoCredits}
            onRefetch={refetchMarket}
          />
        </aside>
      </div>

      {/* Painel de voz (CFO Live / Advisor) */}
      <VoicePanel tenantId={tenantId} plan={plan} />
    </section>
  );
}

