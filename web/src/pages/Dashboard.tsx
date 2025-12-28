// web/src/pages/Dashboard.tsx
import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MomentumPulse from "../components/MomentumPulse";
import AdvisorDock from "../components/AdvisorDock";
import SimulateScenarioModal from "../components/SimulateScenarioModal";
import { usePulseSummary } from "../hooks/usePulseSummary";
import { useCredits } from "../hooks/useCredits";
import { CreditsBar } from "../components/CreditsBar";
import { track } from "../lib/analytics";
import { useToast } from "../components/Toast";
import { DashboardHeaderInfo } from "../components/DashboardHeaderInfo";
import { EmptyState as EmptyStateCard } from "../components/EmptyState";
import CfoSection from "./Dashboard/CfoSection";
import { ImportModal } from "../components/ImportModal";
import { CfoHealthCard } from "../components/CfoHealthCard";
import { CfoVoiceButton } from "../components/CfoVoiceButton";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="p-6 text-sm text-slate-400">
        Carregando seu ambiente financeiro...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6 text-sm text-slate-400">
        Sua sessão expirou. Faça login novamente para ver seus dados.
      </div>
    );
  }

  const [advisorOpen, setAdvisorOpen] = useState(false);
  const [simulateOpen, setSimulateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const tenantId =
    import.meta.env.VITE_DEFAULT_TENANT_ID?.trim?.() ||
    "demo-tenant-001";

  const userName =
    user.displayName ||
    (user.email ? user.email.split("@")[0] : "Você");

  const companyName =
    import.meta.env.VITE_COMPANY_NAME?.trim?.() || "Sua empresa";

  const periodLabel = "Últimos 7 dias";
  const plan = "CFO"; // plano atual do tenant (usado para gating de voz, CFO etc.)
  const showCfo = true; // CFO ativado para testes em produção

  const periodEnd = new Date();
  const periodStart = useMemo(() => {
    const d = new Date(periodEnd);
    d.setDate(d.getDate() - 7);
    return d;
  }, [periodEnd]);

  const iso = (d: Date) => d.toISOString().slice(0, 10);

  const { data, loading, error } = usePulseSummary({
    tenantId,
    periodStart: iso(periodStart),
    periodEnd: iso(periodEnd),
  });

  const {
    credits,
    isLoading: creditsLoading,
    error: creditsError,
  } = useCredits();

  const { notify } = useToast();

  const baseline = data
    ? {
        cashBalance: data.kpis.cashBalance,
        revenueMonth: data.kpis.revenueMonth,
        expenseMonth: data.kpis.expenseMonth,
        runwayMonths: data.kpis.runwayMonths,
      }
    : null;

  const isPulseEmpty = !loading && !error && !data;
  const isDashboardLoading = loading || creditsLoading;

  useEffect(() => {
    if (error) {
      notify({
        type: "error",
        message:
          "Ocorreu um erro ao carregar seus dados financeiros. Tente novamente. Se persistir, fale com o suporte.",
      });
    }
  }, [error, notify]);

  useEffect(() => {
    if (creditsError && import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn("[Credits] Erro ao carregar créditos:", creditsError);
    }
  }, [creditsError]);

  const handleImportClick = () => {
    track("import_open");
    setImportOpen(true);
  };

  const handleSetupClick = () => {
    track("onboarding_open", { from: "dashboard_empty" });
    navigate("/onboarding");
  };

  const handleSupportOpen = () => {
    track("support_open");
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("open-support-dock"));
    }
  };

  return (
    <main className="pt-16 p-6 space-y-6" aria-live="polite">
      {isDashboardLoading && (
        <div
          className="fixed top-14 left-0 md:left-60 right-0 h-0.5 bg-gradient-to-r from-brand-1 via-brand-2 to-brand-1 animate-pulse z-50"
          role="status"
          aria-label="Carregando painel"
        />
      )}

      <DashboardHeaderInfo
        userName={userName}
        companyName={companyName}
        periodLabel={periodLabel}
        lastImportLabel="há 2 dias"
        lastUpdateLabel="há poucos minutos"
        isLoading={isDashboardLoading}
      />

      <CreditsBar credits={credits} isLoading={creditsLoading} />

      {showCfo && (
        <div className="mt-2 max-w-md">
          <CfoHealthCard />
        </div>
      )}

      {!isPulseEmpty && (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={handleImportClick}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100 dark:hover:bg-slate-800/80"
          >
            Nova importação
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        {showCfo && import.meta.env.DEV && <CfoVoiceButton />}

        <div className="flex justify-end gap-2 md:self-start">
          <button
            type="button"
            onClick={handleSupportOpen}
            className="rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100 dark:hover:bg-slate-800/80"
            aria-label="Abrir Suporte"
          >
            Abrir Suporte
          </button>
          <button
            type="button"
            onClick={() => {
              setAdvisorOpen(true);
              track("advisor_open");
            }}
            className="rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100 dark:hover:bg-slate-800/80"
            aria-label="Abrir Advisor"
          >
            Abrir Advisor
          </button>
        </div>
      </div>

      {/* Estado vazio do Pulse / Importações */}
      {isPulseEmpty ? (
        <EmptyStateCard
          title="Seu Pulse ainda está em branco"
          description="Ainda não temos dados financeiros suficientes para gerar seu Pulse. Importe suas transações ou conecte suas contas para começar a ver seus gráficos aqui."
          primaryActionLabel="Importar agora"
          onPrimaryAction={handleImportClick}
          secondaryActionLabel="Configurar perfil de mercado"
          onSecondaryAction={handleSetupClick}
        />
      ) : (
        // Painel principal com KPIs / gráficos
        <MomentumPulse
          data={data}
          loading={loading}
          error={error}
          onOpenAdvisor={() => setAdvisorOpen(true)}
          onSimulate={() => setSimulateOpen(true)}
        />
      )}

      {showCfo && (
        <CfoSection
          onImportClick={handleImportClick}
          tenantId={tenantId}
          plan={plan}
        />
      )}

      <AdvisorDock
        open={advisorOpen}
        onClose={() => setAdvisorOpen(false)}
      />

      <SimulateScenarioModal
        open={simulateOpen}
        onClose={() => setSimulateOpen(false)}
        baseline={baseline || {}}
        onConfirm={(params) => {
          track("simulate_applied", params);
        }}
      />

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
      />
    </main>
  );
}

