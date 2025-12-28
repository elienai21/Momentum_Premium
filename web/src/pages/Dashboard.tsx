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
import { cn } from "../lib/utils";
import { computeHealthFromKpis } from "../services/pulseApi";

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

  const { data, loading, error: pulseError, refetch } = usePulseSummary({
    tenantId,
    periodStart: iso(periodStart),
    periodEnd: iso(periodEnd),
  });
  const error = pulseError as any;

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

  // Consolidamos o estado de "sem dados" ou "erro de carregamento" como um aviso informativo único
  const isDashboardEmpty = !loading && (!data || error);

  useEffect(() => {
    if (creditsError && import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn("[Credits] Erro ao carregar créditos:", creditsError);
    }
  }, [creditsError]);

  const handleImportClick = () => {
    track("import_open");
    navigate("/imports");
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
  const health = data?.health || computeHealthFromKpis((kpis as any) || { cashBalance: 0, revenueMonth: 0, expenseMonth: 0, runwayMonths: 0 });

  return (
    <div className="pt-24 space-y-8 pb-24 fade-in" aria-live="polite">
      {/* 1. Greeting Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 font-display">
            Olá, <span className="text-primary">{userName}</span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 font-display text-sm">
            Empresa: <span className="text-slate-600 dark:text-slate-300 font-medium">{companyName}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge label="Acesso Local" />
          {data?.periodEnd && (
            <StatusBadge label={`Atualizado: ${new Date(data.periodEnd).toLocaleDateString('pt-BR')}`} color="blue" dot />
          )}
        </div>
      </div>

      {/* Global Sync Warning */}
      {error && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-center gap-3 text-amber-500 animate-in fade-in slide-in-from-top-2 duration-500 shadow-glow">
          <span className="material-icons-round">warning</span>
          <div className="text-sm">
            <p className="font-bold font-display">Sincronização Incompleta</p>
            <p className="opacity-80">Não foi possível carregar todos os dados. Verifique sua conexão ou se há importações pendentes.</p>
          </div>
        </div>
      )}

      {/* 2. KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AsyncPanel isLoading={loading} error={null} loadingVariant="skeleton">
          <StatsCard
            label="Saldo em Caixa"
            value={kpis?.cashBalance ? kpis.cashBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : "R$ 0,00"}
            icon={Wallet}
            variant="default"
            className="shadow-sm border-slate-200/50 dark:border-white/5"
          />
          <StatsCard
            label="Receita"
            value={kpis?.revenueMonth ? kpis.revenueMonth.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : "R$ 0,00"}
            icon={CircleDollarSign}
            variant="success"
            className="shadow-sm border-slate-200/50 dark:border-white/5"
          />
          <StatsCard
            label="Despesas"
            value={kpis?.expenseMonth ? kpis.expenseMonth.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : "R$ 0,00"}
            icon={CreditCard}
            variant="danger"
            className="shadow-sm border-slate-200/50 dark:border-white/5"
          />
          <StatsCard
            label="Runway"
            value={kpis?.runwayMonths ? `${Math.round(kpis.runwayMonths)} meses` : "0 meses"}
            icon={Hourglass}
            variant="warn"
            className="shadow-sm border-slate-200/50 dark:border-white/5"
          />
        </AsyncPanel>
      </div>

      {/* 3. Main Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass rounded-xl p-8 relative overflow-hidden border border-primary/20 group h-full">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[80px] -mr-16 -mt-16 pointer-events-none transition-opacity group-hover:opacity-100 opacity-60"></div>

          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12 h-full">
            <div className="relative w-40 h-40 flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle className="text-slate-200 dark:text-slate-800" cx="50" cy="50" fill="none" r="45" stroke="currentColor" strokeWidth="8"></circle>
                <circle className="gauge-anim drop-shadow-[0_0_10px_rgba(110,52,255,0.4)] transition-all duration-1000" cx="50" cy="50" fill="none" r="45" stroke="url(#dashboard-gauge-gradient)"
                  strokeDasharray="283"
                  strokeDashoffset={data ? 283 - (283 * (health.status === 'green' ? 0.85 : health.status === 'yellow' ? 0.65 : 0.45)) : 283}
                  strokeLinecap="round" strokeWidth="8"
                ></circle>
                <defs>
                  <linearGradient id="dashboard-gauge-gradient" x1="0%" x2="100%" y1="0%" y2="0%">
                    <stop offset="0%" stopColor="#6e34ff" />
                    <stop offset="100%" stopColor="#00c6ff" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-slate-800 dark:text-slate-200">
                  {data ? (health.status === 'green' ? '85' : health.status === 'yellow' ? '65' : '45') : '--'}
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest leading-none mt-1">Saúde AI</span>
              </div>
            </div>

            <div className="flex-1 space-y-4 relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex h-6 w-6 items-center justify-center rounded bg-primary/20 text-primary shadow-glow">
                  <span className="material-icons-round text-sm">auto_awesome</span>
                </span>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 font-display">Análise de Saúde Financeira</h3>
              </div>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm">
                {data ? (
                  <>Sua saúde financeira está <strong className={cn(health.status === 'green' ? "text-success" : health.status === 'yellow' ? "text-warning" : "text-error")}>
                    {health.status === 'green' ? 'excelente' : health.status === 'yellow' ? 'em atenção' : 'crítica'}
                  </strong>. {health.reasons?.[0] || "O fluxo de caixa permanece positivo pelo 4º mês consecutivo."}</>
                ) : (
                  "Aguardando sincronização de dados para gerar análise de saúde via IA. Importe seu extrato bancário ou planilha para começar."
                )}
              </p>
              <div className="pt-2 flex flex-wrap gap-3">
                <button
                  onClick={() => navigate(data ? '/cfo/deep-dive' : '/imports')}
                  className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all shadow-glow flex items-center gap-2 group/btn"
                >
                  {data ? 'Ver Detalhes' : 'Importar Agora'}
                  <span className="material-icons-round text-sm group-hover/btn:translate-x-1 transition-transform">arrow_forward</span>
                </button>
                <button className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors shadow-sm">
                  Exportar Relatório
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* IA Suggestions Column */}
        <div className="glass rounded-xl p-6 border-l-4 border-l-cyan-500/80 flex flex-col h-full shadow-sm border-slate-200/50 dark:border-white/5">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-gradient-to-br from-slate-800 to-black border border-slate-700 flex items-center justify-center shadow-lg">
                <span className="material-icons-round text-cyan-400 text-sm">smart_toy</span>
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200 font-display">Sugestões do CFO</h3>
            </div>
            <span className="text-[9px] bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 px-2.5 py-1 rounded-lg border border-cyan-500/20 font-bold uppercase tracking-wider font-display text-slate-800 dark:text-slate-200">IA Ativa</span>
          </div>

          <AsyncPanel
            isLoading={loading}
            error={null}
            isEmpty={!data?.alerts?.length}
            emptyTitle="Dados Insuficientes"
            emptyDescription="Importe mais transações para gerar sugestões."
          >
            <div className="space-y-4 flex-1">
              {data?.alerts?.slice(0, 3).map((alert) => (
                <SuggestionItem
                  key={alert.id}
                  title={alert.type.toUpperCase()}
                  badge={alert.type === 'anomalia' ? 'Risco' : 'Aviso'}
                  type={alert.type === 'anomalia' ? 'danger' : 'warning'}
                  desc={alert.message}
                  actions={['Analisar', 'Ignorar']}
                />
              ))}
            </div>
          </AsyncPanel>
        </div>
      </div>

      {/* 4. Transactions Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 font-display uppercase tracking-widest text-[10px] opacity-70">Últimas Transações Inteligentes</h3>
          <button onClick={() => navigate('/transactions')} className="text-[10px] text-primary font-bold uppercase flex items-center gap-1 hover:underline tracking-widest font-display">
            Fluxo Completo <span className="material-icons-round text-sm">arrow_forward</span>
          </button>
        </div>

        <AsyncPanel
          isLoading={txLoading}
          error={null}
          isEmpty={recentTransactions.length === 0}
          emptyTitle="Sem Transações"
          emptyDescription="A sincronização com seu banco ainda não retornou movimentos financeiros."
        >
          <GlassPanel className="p-0 overflow-hidden border border-slate-200/50 dark:border-white/5 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-white/5 text-slate-400 font-bold uppercase tracking-widest text-[9px] border-b border-slate-200 dark:border-white/5">
                  <tr>
                    <th className="px-6 py-4">Data</th>
                    <th className="px-6 py-4">Descrição</th>
                    <th className="px-6 py-4">Categoria</th>
                    <th className="px-6 py-4 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {recentTransactions.map((tx, i) => (
                    <tr key={i} className="hover:bg-primary/5 transition-colors cursor-pointer group" onClick={() => navigate('/transactions')}>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-medium">{tx.date}</td>
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100 truncate max-w-[200px]">{tx.description}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-[9px] tracking-tighter">
                          {tx.category}
                        </span>
                      </td>
                      <td className={cn(
                        "px-6 py-4 text-right font-black tracking-tight",
                        tx.type === 'credit' ? "text-emerald-500" : "text-slate-900 dark:text-white"
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

      {/* 5. Deep Dive Banner Section */}
      <section className="border-t border-slate-200/50 dark:border-white/5 pt-8 mt-4">
        <div className="glass relative overflow-hidden rounded-xl border border-primary/20 p-8 shadow-sm group">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-64 h-64 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full blur-3xl opacity-50 transition-opacity group-hover:opacity-70"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-start gap-5">
              <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary text-white shadow-glow">
                <span className="material-symbols-outlined text-2xl font-bold">finance_mode</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 font-display mb-1 flex items-center gap-2">
                  Deep Dive Financeiro
                  <span className="sm:hidden material-symbols-outlined text-primary">finance_mode</span>
                </h2>
                <p className="text-slate-500 dark:text-slate-400 max-w-2xl text-sm leading-relaxed font-display">
                  Acesse a nova tela dedicada para análises profundas. Visualize o fluxo de caixa, monitore transações inteligentes e receba alertas de IA em tempo real.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/cfo/deep-dive')}
              className="w-full md:w-auto shrink-0 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg text-sm font-bold transition-all shadow-glow hover:shadow-lg flex items-center justify-center gap-2 group/btn font-display"
            >
              <span>Acessar Análise Completa</span>
              <span className="material-icons-round text-sm group-hover/btn:translate-x-1 transition-transform">arrow_forward</span>
            </button>
          </div>
        </div>
      </section>

      {/* 5. Footer Support Buttons */}
      <div className="flex gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <button
          onClick={handleSupportOpen}
          className="px-5 py-2.5 rounded-full border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-[11px] font-bold uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm"
        >
          Abrir Suporte
        </button>
        <button
          className="px-5 py-2.5 rounded-full border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-[11px] font-bold uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm"
        >
          Falar com Advisor
        </button>
      </div>

      <AdvisorDock open={advisorOpen} onClose={() => setAdvisorOpen(false)} />
      <SimulateScenarioModal
        open={simulateOpen}
        onClose={() => setSimulateOpen(false)}
        baseline={baseline || {}}
        onConfirm={(params) => track("simulate_applied", params as any)}
      />
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}

const SuggestionItem: React.FC<any> = ({ title, badge, desc, type, actions }) => {
  const badgeColors: any = {
    success: 'text-success bg-success/10',
    warning: 'text-warning bg-warning/10',
    danger: 'text-error bg-error/10',
  };
  return (
    <div className="bg-white dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-white/5 hover:border-primary/40 transition-colors shadow-sm group">
      <div className="flex justify-between items-start mb-2">
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 font-display">{title}</h4>
        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border border-current/10 font-display ${badgeColors[type]}`}>{badge}</span>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{desc}</p>
      <div className="flex gap-2">
        <button className="flex-1 bg-slate-200/50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 text-[10px] py-1.5 rounded font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition uppercase tracking-widest leading-none font-display">{actions[0]}</button>
        <button className="flex-1 bg-primary/10 text-primary hover:bg-primary hover:text-white text-[10px] py-1.5 rounded font-bold transition border border-primary/20 uppercase tracking-widest leading-none font-display">{actions[1]}</button>
      </div>
    </div>
  );
};

const StatusBadge: React.FC<{ label: string, color?: string, dot?: boolean }> = ({ label, color = 'slate', dot = false }) => {
  const styles: any = {
    slate: 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400',
    success: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400',
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800 text-blue-600 dark:text-blue-400',
  };
  return (
    <div className={`px-3 py-1 rounded-full border text-[11px] font-bold flex items-center gap-2 shadow-sm ${styles[color]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${color === 'slate' ? 'bg-slate-400' : color === 'success' ? 'bg-emerald-500' : 'bg-blue-500'} ${dot ? 'animate-pulse' : ''}`}></span>
      {label}
    </div>
  );
};
