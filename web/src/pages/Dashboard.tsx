// web/src/pages/Dashboard.tsx
import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Wallet, CircleDollarSign, CreditCard, Hourglass, TrendingUp, ArrowRight } from "lucide-react";

import { usePulseSummary } from "../hooks/usePulseSummary";
import { useCredits } from "../hooks/useCredits";
import { track } from "../lib/analytics";
import { useToast } from "../components/Toast";
import { useAuth } from "../context/AuthContext";
import { getFriendlyError } from "../lib/errorMessages";

// Components
import AdvisorDock from "../components/AdvisorDock";
import SimulateScenarioModal from "../components/SimulateScenarioModal";
import { ImportModal } from "../components/ImportModal";
import { EmptyState as EmptyStateCard } from "../components/EmptyState";
import { CreditsBar } from "../components/CreditsBar";

// CFO Components
import CfoSection from "./Dashboard/CfoSection";
import { CfoHealthCard } from "../components/CfoHealthCard";
import { CfoVoiceButton } from "../components/CfoVoiceButton";

// Primitives
import { GlassPanel } from "../components/ui/GlassPanel";
import { SectionHeader } from "../components/ui/SectionHeader";
import { StatsCard } from "../components/ui/StatsCard";
import { Badge } from "../components/ui/Badge";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="p-8 text-sm text-momentum-muted">
        Carregando seu ambiente financeiro...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 text-sm text-momentum-muted">
        Sua sessão expirou. Faça login novamente para ver seus dados.
      </div>
    );
  }

  const [advisorOpen, setAdvisorOpen] = useState(false);
  const [simulateOpen, setSimulateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const tenantId =
    import.meta.env.VITE_DEFAULT_TENANT_ID?.trim?.() || "demo-tenant-001";

  const userName =
    user.displayName || (user.email ? user.email.split("@")[0] : "Você");

  const companyName =
    import.meta.env.VITE_COMPANY_NAME?.trim?.() || "Sua empresa";

  const periodLabel = "Últimos 7 dias";
  const plan = "CFO";
  const showCfo = true;

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
          "Ocorreu um erro ao carregar seus dados financeiros. Tente novamente.",
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

  const friendlyError = error ? getFriendlyError(error) : null;
  const kpis = data?.kpis;

  return (
    <div className="space-y-8 pb-20 fade-in" aria-live="polite">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-momentum-text dark:text-white font-display">
            Olá, <span className="text-momentum-accent">{userName}</span>
          </h2>
          <p className="text-momentum-muted mt-1">Empresa: <span className="font-medium text-momentum-text/80 dark:text-momentum-text/80">{companyName}</span></p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="neutral">{periodLabel}</Badge>
          <Badge variant="success">Última importação: há 2 dias</Badge>
          <Badge variant="warn">Atualizado: há poucos minutos</Badge>
        </div>
      </div>

      {/* Credits Bar */}
      <CreditsBar />

      {/* Actions Bar */}
      {!isPulseEmpty && (
        <div className="flex justify-end gap-2">
          <button
            onClick={handleImportClick}
            className="bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-momentum-text border border-momentum-border px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm"
          >
            Nova importação
          </button>
        </div>
      )}


      {/* 2. Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <GlassPanel key={i} className="h-32 animate-pulse bg-current/5" ><div /></GlassPanel>)}
        </div>
      ) : friendlyError ? (
        <EmptyStateCard
          title={friendlyError.title}
          description={friendlyError.message}
          actionLabel={friendlyError.ctaLabel}
          onActionClick={friendlyError.ctaHref ? () => window.location.href = friendlyError.ctaHref! : undefined}
          icon="⚠️"
        />
      ) : isPulseEmpty ? (
        <EmptyStateCard
          title="Seu Pulse ainda está em branco"
          description="Ainda não temos dados financeiros suficientes para gerar seu Pulse."
          primaryActionLabel="Importar agora"
          onPrimaryAction={handleImportClick}
          secondaryActionLabel="Configurar perfil"
          onSecondaryAction={handleSetupClick}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard label="Saldo em Caixa" value={String(kpis?.cashBalance || "R$ 0,00")} icon={Wallet} variant="default" />
          <StatsCard label="Receita (MRR)" value={String(kpis?.revenueMonth || "R$ 0,00")} icon={CircleDollarSign} variant="success" />
          <StatsCard label="Despesas" value={String(kpis?.expenseMonth || "R$ 0,00")} icon={CreditCard} variant="danger" />
          <StatsCard label="Runway" value={`${kpis?.runwayMonths || 0} meses`} icon={Hourglass} variant="warn" />
        </div>
      )}

      {/* 3. Metrics & Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* CFO Health Card */}
          {showCfo && <CfoHealthCard />}

          {/* 4. Deep Dive Hero Card */}
          <section className="relative overflow-hidden rounded-xl border border-momentum-accent/20 p-8 shadow-sm group">
            {/* Background effects */}
            <GlassPanel className="absolute inset-0 z-0 bg-gradient-to-br from-momentum-accent/10 to-momentum-secondary/10 opacity-50" ><div /></GlassPanel>
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-start gap-5">
                <div className="hidden sm:flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-momentum-accent to-momentum-secondary text-white shadow-momentum-glow">
                  <TrendingUp size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-momentum-text dark:text-white font-display mb-2 flex items-center gap-2">
                    Deep Dive Financeiro
                  </h2>
                  <p className="text-momentum-muted max-w-2xl text-sm leading-relaxed">
                    Acesse a nova tela dedicada para análises profundas. Visualize o fluxo de caixa, monitore transações e receba alertas de anomalias.
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/cfo/deep-dive')}
                className="bg-momentum-accent hover:bg-momentum-accent/90 text-white px-6 py-3.5 rounded-lg text-sm font-medium transition-all shadow-momentum-glow flex items-center gap-2 whitespace-nowrap"
              >
                Acessar Análise <ArrowRight size={16} />
              </button>
            </div>
          </section>
        </div>

        <div className="lg:col-span-1 space-y-6">
          {showCfo && <CfoSection onImportClick={handleImportClick} tenantId={tenantId} plan={plan} />}

          {/* Support / Actions */}
          <div className="flex flex-col gap-3">
            {showCfo && import.meta.env.DEV && <CfoVoiceButton />}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={handleSupportOpen} className="p-3 rounded-lg border border-momentum-border bg-white/50 dark:bg-white/5 text-sm font-medium hover:bg-white dark:hover:bg-white/10 transition">
                Abrir Suporte
              </button>
              <button onClick={() => { setAdvisorOpen(true); track("advisor_open"); }} className="p-3 rounded-lg border border-momentum-border bg-white/50 dark:bg-white/5 text-sm font-medium hover:bg-white dark:hover:bg-white/10 transition">
                Abrir Advisor
              </button>
            </div>
          </div>
        </div>
      </div>

      <AdvisorDock open={advisorOpen} onClose={() => setAdvisorOpen(false)} />
      <SimulateScenarioModal
        open={simulateOpen}
        onClose={() => setSimulateOpen(false)}
        baseline={baseline || {}}
        onConfirm={(params) => track("simulate_applied", params)}
      />
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
