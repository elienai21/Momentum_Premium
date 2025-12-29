import React from "react";
import { useCredits } from "@/hooks/useCredits";
import { useUsageLogs } from "@/hooks/useUsageLogs";
import { useTenant as useTenantCtx } from "@/context/TenantContext";
import { useTenant as useTenantData } from "@/hooks/useTenant";
import Topbar from "@/components/Topbar";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Shield, CreditCard, Sparkles, RefreshCw, Zap, ExternalLink, History, Building2 } from "lucide-react";

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatDate(iso: string | undefined) {
  if (!iso) return "N/A";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "N/A";
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const Settings: React.FC = () => {
  const { credits, isLoading: loadingCredits, refetch } = useCredits();
  const { logs, isLoading: loadingLogs } = useUsageLogs(10);
  const { tenantId } = useTenantCtx();
  const tenant = useTenantData(tenantId);

  const quota = credits?.monthlyQuota || 0;
  const available = credits?.available || 0;
  const percent = quota > 0 ? Math.min(100, Math.max(0, (available / quota) * 100)) : 0;

  const planName = (credits?.planNormalized || (tenant as any)?.plan || "Starter").toUpperCase();
  const renewsAt = formatDate(credits?.renewsAt);
  const periodSource = credits?.periodSource === "stripe" ? "Ciclo de Faturamento" : "Ciclo de 30 dias";

  return (
    <div className="pt-24 space-y-8 pb-24 fade-in" aria-live="polite">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 font-display">
            Preferências da Conta
          </h2>
          <p className="text-slate-500 dark:text-slate-400 font-display text-sm">
            Gerencie seu plano, faturamento e créditos de IA do Momentum.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge label={planName} color="success" />
          {credits?.periodSource === "stripe" && (
            <StatusBadge label="Stripe Ativo" color="blue" dot />
          )}
        </div>
      </div>

      {/* Plan & Organization Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Plan Card */}
        <div className="md:col-span-2 glass rounded-xl p-8 relative overflow-hidden border border-primary/20 group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[80px] -mr-16 -mt-16 pointer-events-none transition-opacity group-hover:opacity-100 opacity-60"></div>

          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/20 text-primary shadow-glow">
                <Shield size={24} />
              </div>
              <div>
                <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-display">Seu Plano Atual</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-slate-800 dark:text-slate-200 font-display">{planName}</span>
                  <span className="px-2 py-0.5 rounded-full bg-success/20 text-success text-[10px] font-bold uppercase font-display">Ativo</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-white dark:bg-slate-800/40 border border-slate-200/50 dark:border-white/5 shadow-sm space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-display">Próxima renovação</span>
                <p className="font-semibold text-slate-700 dark:text-slate-200 font-display">{renewsAt}</p>
              </div>
              <div className="p-4 rounded-xl bg-white dark:bg-slate-800/40 border border-slate-200/50 dark:border-white/5 shadow-sm space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-display">Método de faturamento</span>
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                  <CreditCard size={14} className="text-slate-400" />
                  <p className="font-semibold text-sm font-display">Cartão final **** 4242</p>
                </div>
              </div>
            </div>

            <div className="pt-4 flex flex-wrap gap-3">
              <button className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all shadow-glow flex items-center gap-2 group/btn font-display">
                Alterar Plano
                <RefreshCw size={16} className="group-hover/btn:rotate-180 transition-transform duration-500" />
              </button>
              <button className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm flex items-center gap-2 font-display">
                Gerenciar Faturamento
                <ExternalLink size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Organization Info Card */}
        <GlassPanel className="p-6 border border-slate-200/50 dark:border-white/5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={18} className="text-primary" />
            <h3 className="font-bold text-slate-800 dark:text-slate-200 tracking-tight font-display">Dados da Organização</h3>
          </div>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold text-slate-400 tracking-widest font-display">Nome do Tenant</label>
              <p className="text-slate-700 dark:text-slate-200 font-bold text-sm font-display">{tenant?.name || "Minha Empresa"}</p>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold text-slate-400 tracking-widest font-display">Workspace ID</label>
              <code className="text-[11px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-400 font-mono block truncate">{tenantId || "---"}</code>
            </div>
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <button className="text-xs text-primary hover:text-primary/80 font-bold uppercase tracking-wider font-display">Editar Perfil Empresa</button>
            </div>
          </div>
        </GlassPanel>
      </div>

      {/* Credits Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded bg-primary/20 text-primary shadow-glow">
            <Sparkles size={14} />
          </span>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 font-display">Créditos de IA &amp; Automação</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Usage Visualization */}
          <GlassPanel className="lg:col-span-2 p-6 flex flex-col md:flex-row gap-8 border border-slate-200/50 dark:border-white/5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex-1 space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm text-slate-600 dark:text-slate-300 font-bold tracking-tight font-display">Uso no Período Atual</p>
                  <p className="text-[11px] text-slate-400 italic font-display">Baseado no {periodSource}</p>
                </div>
                <button
                  onClick={() => refetch()}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-primary transition-colors"
                  title="Recarregar"
                >
                  <RefreshCw size={16} className={loadingCredits ? "animate-spin" : ""} />
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex items-end justify-between">
                  <span className="text-4xl font-black text-slate-800 dark:text-slate-200 tracking-tighter font-display">
                    {formatNumber(available)}
                    <span className="text-lg font-normal text-slate-400 ml-1">restantes</span>
                  </span>
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md font-display">
                    Cota: {formatNumber(quota)}
                  </span>
                </div>
                <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-1 shadow-inner">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${percent > 40 ? "bg-gradient-to-r from-primary to-secondary" :
                        percent > 15 ? "bg-warning" : "bg-error"
                      }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400 tracking-widest pt-1 px-1 font-display">
                  <span>Início: {formatDate(credits?.lastResetAt)}</span>
                  <span>Renova em: {renewsAt}</span>
                </div>
              </div>
            </div>

            <div className="w-full md:w-56 p-5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex flex-col justify-center gap-3">
              <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 font-bold text-sm font-display">
                <Zap size={16} className="fill-cyan-500/30" />
                <span>Dica Momentum</span>
              </div>
              <p className="text-[11px] text-cyan-700 dark:text-cyan-300 leading-relaxed font-medium font-display">
                Relatórios avançados consomem 20 créditos. O Health Score diário utiliza apenas 5.
              </p>
              <button className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400 mt-2 hover:bg-cyan-500/10 px-2 py-1 rounded transition-colors w-fit border border-cyan-500/30 font-display uppercase tracking-wider">
                Ver Tabela de Custos
              </button>
            </div>
          </GlassPanel>

          {/* Upgrade CTA */}
          <div className="glass rounded-xl p-6 relative overflow-hidden border border-primary/30 group flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/40 to-secondary/40 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-glow">
                <Sparkles size={20} className="text-white" />
              </div>
              <h3 className="font-bold text-xl leading-tight tracking-tight text-slate-800 dark:text-slate-200 font-display">Precisa de mais Inteligência?</h3>
              <p className="text-slate-500 dark:text-slate-400 text-[13px] leading-relaxed font-display">Adicione pacotes extras de 1.000 créditos ou migre para o Plano Business.</p>
            </div>
            <button className="relative z-10 mt-6 w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold transition-all shadow-glow active:scale-95 text-sm uppercase tracking-wider font-display">
              Ver Opções de Upgrade
            </button>
          </div>
        </div>
      </div>

      {/* Usage History Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 font-display uppercase tracking-widest text-[10px] opacity-70 flex items-center gap-2">
            <History size={14} /> Histórico de Uso
          </h3>
        </div>

        <GlassPanel className="p-0 overflow-hidden border border-slate-200/50 dark:border-white/5 shadow-sm">
          {loadingLogs ? (
            <div className="p-6 text-center text-slate-400 font-display">Carregando...</div>
          ) : logs.length === 0 ? (
            <div className="p-6 text-center text-slate-400 italic font-display">Nenhum registro de uso encontrado.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-white/5 text-slate-400 font-bold uppercase tracking-widest text-[9px] border-b border-slate-200 dark:border-white/5">
                  <tr>
                    <th className="px-6 py-4 font-display">Tipo</th>
                    <th className="px-6 py-4 font-display">Fonte</th>
                    <th className="px-6 py-4 text-right font-display">Créditos</th>
                    <th className="px-6 py-4 text-right font-display">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-primary/5 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100 font-display">{log.type}</td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-display">{log.source}</td>
                      <td className="px-6 py-4 text-right font-black text-error tracking-tight font-display">-{log.creditsConsumed}</td>
                      <td className="px-6 py-4 text-right text-slate-400 text-xs font-display">{formatDate(log.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassPanel>
      </div>

      {/* Footer Support Buttons */}
      <div className="flex gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <button className="px-5 py-2.5 rounded-full border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-[11px] font-bold uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm font-display">
          Abrir Suporte
        </button>
        <button className="px-5 py-2.5 rounded-full border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-[11px] font-bold uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm font-display">
          Falar com Advisor
        </button>
      </div>
    </div>
  );
};

const StatusBadge: React.FC<{ label: string; color?: string; dot?: boolean }> = ({ label, color = "slate", dot = false }) => {
  const styles: Record<string, string> = {
    slate: "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400",
    success: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400",
    blue: "bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800 text-blue-600 dark:text-blue-400",
  };
  const dotColors: Record<string, string> = {
    slate: "bg-slate-400",
    success: "bg-emerald-500",
    blue: "bg-blue-500",
  };
  return (
    <div className={`px-3 py-1 rounded-full border text-[11px] font-bold flex items-center gap-2 shadow-sm font-display ${styles[color]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColors[color]} ${dot ? "animate-pulse" : ""}`}></span>
      {label}
    </div>
  );
};

export default Settings;
