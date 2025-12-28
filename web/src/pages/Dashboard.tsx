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
import { AsyncPanel } from "../components/ui/AsyncPanel";
import { HeroCard } from "../components/dashboard/HeroCard";
import { InsightCard } from "../components/ui/InsightCard";
import { InsightList } from "../components/ui/InsightList";
import { Skeleton } from "../components/ui/Skeleton";
import { RefreshCw, Download, FileText, ChevronRight } from "lucide-react";

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

  // Fetch recent transactions (mirroring Transactions.tsx but compact)
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(false);

  useEffect(() => {
    async function fetchRecentTx() {
      if (!user) return;
      setTxLoading(true);
      try {
        const payload = { from: null, to: null, category: null, type: null, card: null, q: null };
        const { data: txData } = await (import("../services/api").then(m => m.api.post("/portal/transactions/filter", payload)));
        setRecentTransactions(txData?.transactions?.slice(0, 5) || []);
      } catch (err) {
        console.warn("Falha ao carregar transações recentes:", err);
      } finally {
        setTxLoading(false);
      }
    }
    fetchRecentTx();
  }, [user]);

  const handleRefresh = () => {
    refetch();
    // Re-fetch transactions too
    const payload = { from: null, to: null, category: null, type: null, card: null, q: null };
    import("../services/api").then(m => m.api.post("/portal/transactions/filter", payload)).then(res => {
      setRecentTransactions(res.data?.transactions?.slice(0, 5) || []);
    });
  };

  const dashboardLoading = loading || creditsLoading;
  const health = data?.health || computeHealthFromKpis(kpis || { cashBalance: 0, revenueMonth: 0, expenseMonth: 0, runwayMonths: 0 });

  return (
    <div className="space-y-8 pb-24 fade-in" aria-live="polite">
      {/* 1. Header Area */}
      <SectionHeader
        title={<>Dashboard</>}
        subtitle={<>Bem-vindo de volta, <span className="text-momentum-accent font-semibold">{userName}</span> • {periodLabel}</>}
        actions={
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              className="bg-momentum-bg/50 hover:bg-white text-momentum-text border border-momentum-border px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm flex items-center gap-2"
            >
              <RefreshCw size={14} className={cn(loading && "animate-spin")} /> Atualizar
            </button>
            <button
              onClick={() => navigate('/transactions')}
              className="bg-momentum-accent hover:bg-momentum-accent/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-momentum-glow flex items-center gap-2"
            >
              <Download size={14} /> Exportar
            </button>
          </div>
        }
      />

      {/* 2. Hero Component */}
      <AsyncPanel isLoading={loading} error={error}>
        <HeroCard
          title={`Sua saúde financeira está ${health.status === 'green' ? 'excelente' : health.status === 'yellow' ? 'em atenção' : 'crítica'}`}
          description={health.reasons?.[0] || "Continue monitorando seus indicadores para manter o crescimento sustentável da sua empresa."}
          badge={
            <Badge variant={health.status === 'green' ? 'success' : health.status === 'yellow' ? 'warn' : 'danger'} className="uppercase tracking-tighter font-bold">
              Score: {health.status === 'green' ? '85' : health.status === 'yellow' ? '65' : '40'}
            </Badge>
          }
          mainKpiLabel="Net Cash (Mensal)"
          mainKpiValue={((kpis?.revenueMonth || 0) - (kpis?.expenseMonth || 0)).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
          miniStats={[
            { label: "Runway Estimado", value: `${kpis?.runwayMonths || 0} meses`, icon: Hourglass, variant: (kpis?.runwayMonths || 0) > 6 ? "success" : "warn" },
            { label: "Margem Líquida", value: `${Math.round((kpis?.marginNet || 0) * 100)}%`, icon: TrendingUp, variant: (kpis?.marginNet || 0) > 0.2 ? "success" : "default" },
          ]}
          actions={
            <button
              onClick={() => navigate('/cfo/deep-dive')}
              className="px-6 py-2.5 bg-momentum-accent text-white rounded-lg text-sm font-bold shadow-momentum-glow flex items-center gap-2"
            >
              Ver Detalhes <ArrowRight size={16} />
            </button>
          }
        />
      </AsyncPanel>

      {/* 3. KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AsyncPanel isLoading={loading} error={error} loadingVariant="skeleton">
          <StatsCard label="Saldo em Caixa" value={String(kpis?.cashBalance || "R$ 0,00")} icon={Wallet} variant="default" />
          <StatsCard label="Receita (MRR)" value={String(kpis?.revenueMonth || "R$ 0,00")} icon={CircleDollarSign} variant="success" />
          <StatsCard label="Despesas" value={String(kpis?.expenseMonth || "R$ 0,00")} icon={CreditCard} variant="danger" />
          <StatsCard label="Runway" value={`${kpis?.runwayMonths || 0} meses`} icon={Hourglass} variant="warn" />
        </AsyncPanel>
      </div>

      {/* 4. Bottom Grid: Alerts & Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Alerts Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-momentum-text font-display">Alertas Recentes</h3>
            <button onClick={() => navigate('/alerts')} className="text-xs text-momentum-accent font-bold uppercase flex items-center gap-1 hover:underline">
              Ver todos <ChevronRight size={14} />
            </button>
          </div>

          <AsyncPanel isLoading={loading} error={error} isEmpty={!data?.alerts?.length} emptyTitle="Nenhum alerta" emptyDescription="Sua conta está sem pendências.">
            <InsightList>
              {data?.alerts?.slice(0, 3).map((alert) => (
                <InsightCard
                  key={alert.id}
                  title={alert.title}
                  description={alert.message}
                  severity={alert.type === 'anomalia' ? 'danger' : 'warn'}
                  className="p-4"
                />
              ))}
            </InsightList>
          </AsyncPanel>
        </div>

        {/* Transactions Panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-momentum-text font-display">Últimas Transações</h3>
            <button onClick={() => navigate('/transactions')} className="text-xs text-momentum-accent font-bold uppercase flex items-center gap-1 hover:underline">
              Abrir Extrato <ChevronRight size={14} />
            </button>
          </div>

          <AsyncPanel isLoading={txLoading} error={null} isEmpty={recentTransactions.length === 0}>
            <GlassPanel className="p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-momentum-muted/5 text-momentum-muted font-bold uppercase tracking-widest text-[10px] border-b border-momentum-border">
                    <tr>
                      <th className="px-5 py-3">Data</th>
                      <th className="px-5 py-3">Descrição</th>
                      <th className="px-5 py-3">Categoria</th>
                      <th className="px-5 py-3 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-momentum-border">
                    {recentTransactions.map((tx, i) => (
                      <tr key={i} className="hover:bg-momentum-accent/5 transition-colors cursor-pointer" onClick={() => navigate('/transactions')}>
                        <td className="px-5 py-3 text-momentum-text opacity-70">{tx.date}</td>
                        <td className="px-5 py-3 font-medium text-momentum-text truncate max-w-[140px]">{tx.description}</td>
                        <td className="px-5 py-3">
                          <Badge variant="neutral" className="text-[9px]">{tx.category}</Badge>
                        </td>
                        <td className={cn(
                          "px-5 py-3 text-right font-bold",
                          tx.type === 'credit' ? "text-momentum-success" : "text-momentum-text"
                        )}>
                          {tx.type === 'debit' ? '-' : ''}{Math.abs(tx.amount || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassPanel>
          </AsyncPanel>
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
