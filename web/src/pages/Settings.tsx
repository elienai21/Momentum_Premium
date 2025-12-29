import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useCredits } from "@/hooks/useCredits";
import { useUsageLogs } from "@/hooks/useUsageLogs";
import { useTenant as useTenantCtx } from "@/context/TenantContext";
import { useTenant as useTenantData } from "@/hooks/useTenant";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { AsyncPanel } from "@/components/ui/AsyncPanel";
import { Shield, CreditCard, Sparkles, RefreshCw, Zap, ExternalLink, History, Building2, User, Settings as SettingsIcon } from "lucide-react";
import { api } from "@/services/api";

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatDate(iso: string | undefined) {
  if (!iso) return "N/A";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "N/A";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

type TabId = "profile" | "billing";

import { useToast } from "@/components/Toast";

const Settings: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { notify } = useToast();
  const initialTab = (searchParams.get("tab") as TabId) || "billing";
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  const { credits, isLoading: loadingCredits, refetch } = useCredits();
  const { logs, isLoading: loadingLogs } = useUsageLogs(10);
  const { tenantId } = useTenantCtx();
  const tenant = useTenantData(tenantId);

  // Profile form state
  const [profileName, setProfileName] = useState("");
  const [profileRole, setProfileRole] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (tenant) {
      setProfileName((tenant as any)?.name || "");
    }
  }, [tenant]);

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      // Stub: In production, call API to update profile
      await new Promise((r) => setTimeout(r, 500));
      console.log("Profile saved:", { profileName, profileRole });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleOpenBillingPortal = async () => {
    try {
      const response = await api.get<{ url: string; code?: string; error?: string }>("/billing/portal");

      if (response.data.code === "requires_setup" || (response.data.error && !response.data.url)) {
        notify({
          type: "info",
          message: "Sua conta ainda não possui faturas geradas. Entre em contato com o suporte."
        });
        return;
      }

      if (response.data.url) {
        window.open(response.data.url, "_blank");
      }
    } catch (err: any) {
      console.warn("Billing portal error:", err);
      if (err?.response?.data?.code === "NO_STRIPE_CUSTOMER") {
        notify({
          type: "info",
          message: "Sua conta ainda não possui faturas geradas."
        });
      }
    }
  };

  const quota = credits?.monthlyQuota || 0;
  const available = credits?.available || 0;
  const percent = quota > 0 ? Math.min(100, Math.max(0, (available / quota) * 100)) : 0;
  const planName = (credits?.planNormalized || (tenant as any)?.plan || "Starter").toUpperCase();
  const renewsAt = formatDate(credits?.renewsAt);
  const periodSource = credits?.periodSource === "stripe" ? "Ciclo de Faturamento" : "Ciclo de 30 dias";

  const tabs = [
    { id: "profile" as TabId, label: "Perfil", icon: User },
    { id: "billing" as TabId, label: "Plano & Créditos", icon: CreditCard },
  ];

  return (
    <div className="pt-24 space-y-8 pb-24 fade-in" aria-live="polite">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 font-display flex items-center gap-2">
            <SettingsIcon size={24} className="text-primary" />
            Configurações
          </h2>
          <p className="text-slate-500 dark:text-slate-400 font-display text-sm">
            Gerencie seu perfil, plano e créditos de IA.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge label={planName} color="success" />
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-bold transition-all font-display ${activeTab === tab.id
              ? "bg-white dark:bg-slate-800 text-primary border-b-2 border-primary shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50"
              }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-300">
          <GlassPanel className="p-6 border border-slate-200/50 dark:border-white/5">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-lg font-bold shadow-glow">
                {profileName?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-200 font-display">Dados do Perfil</h3>
                <p className="text-xs text-slate-400 font-display">Atualize suas informações pessoais</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest font-display">Nome Completo</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-display focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="Seu nome"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest font-display">Cargo</label>
                <input
                  type="text"
                  value={profileRole}
                  onChange={(e) => setProfileRole(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-display focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="Ex: Diretor Financeiro"
                />
              </div>
              <button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm transition-all shadow-glow disabled:opacity-50 font-display"
              >
                {savingProfile ? "Salvando..." : "Salvar Alterações"}
              </button>
            </div>
          </GlassPanel>

          <GlassPanel className="p-6 border border-slate-200/50 dark:border-white/5">
            <div className="flex items-center gap-2 mb-4">
              <Building2 size={18} className="text-primary" />
              <h3 className="font-bold text-slate-800 dark:text-slate-200 font-display">Dados da Organização</h3>
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
            </div>
          </GlassPanel>
        </div>
      )}

      {/* Billing Tab */}
      {activeTab === "billing" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Plan Card */}
          <div className="glass rounded-xl p-8 relative overflow-hidden border border-primary/20 group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[80px] -mr-16 -mt-16 pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/20 text-primary shadow-glow">
                  <Shield size={24} />
                </div>
                <div>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-display">Seu Plano</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-slate-800 dark:text-slate-200 font-display">{planName}</span>
                    <span className="px-2 py-0.5 rounded-full bg-success/20 text-success text-[10px] font-bold uppercase">Ativo</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 font-display">Renova em: {renewsAt}</p>
                </div>
              </div>
              <button
                onClick={handleOpenBillingPortal}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm flex items-center gap-2 font-display"
              >
                Gerenciar Assinatura
                <ExternalLink size={16} />
              </button>
            </div>
          </div>

          {/* Credits Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded bg-primary/20 text-primary shadow-glow">
                <Sparkles size={14} />
              </span>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 font-display">Créditos de IA</h3>
            </div>

            <GlassPanel className="p-6 border border-slate-200/50 dark:border-white/5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 font-bold font-display">Uso no Período</p>
                  <p className="text-[11px] text-slate-400 italic font-display">{periodSource}</p>
                </div>
                <button onClick={() => refetch()} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-primary transition-colors">
                  <RefreshCw size={16} className={loadingCredits ? "animate-spin" : ""} />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-end justify-between">
                  <span className="text-4xl font-black text-slate-800 dark:text-slate-200 tracking-tighter font-display">
                    {formatNumber(available)}
                    <span className="text-lg font-normal text-slate-400 ml-1">restantes</span>
                  </span>
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md font-display">
                    Cota: {formatNumber(quota)}
                  </span>
                </div>
                <div className="h-5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-1 shadow-inner">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${percent > 40 ? "bg-gradient-to-r from-primary to-secondary" :
                      percent > 15 ? "bg-warning" : "bg-error"
                      }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            </GlassPanel>
          </div>

          {/* Usage History */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <History size={16} className="text-slate-500" />
              <h3 className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest font-display">Histórico de Uso</h3>
            </div>

            <AsyncPanel isLoading={loadingLogs} error={null} isEmpty={logs.length === 0} emptyTitle="Sem registros" emptyDescription="Nenhum consumo de créditos registrado ainda.">
              <GlassPanel className="p-0 overflow-hidden border border-slate-200/50 dark:border-white/5">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/5">
                    <tr>
                      <th className="px-4 py-3 text-left text-[9px] font-bold uppercase text-slate-400 tracking-widest font-display">Tipo</th>
                      <th className="px-4 py-3 text-left text-[9px] font-bold uppercase text-slate-400 tracking-widest font-display">Fonte</th>
                      <th className="px-4 py-3 text-right text-[9px] font-bold uppercase text-slate-400 tracking-widest font-display">Créditos</th>
                      <th className="px-4 py-3 text-right text-[9px] font-bold uppercase text-slate-400 tracking-widest font-display">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-primary/5 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200 font-display">{log.type}</td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-display">{log.source}</td>
                        <td className="px-4 py-3 text-right font-black text-error font-display">-{log.creditsConsumed}</td>
                        <td className="px-4 py-3 text-right text-slate-400 font-display">{formatDate(log.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </GlassPanel>
            </AsyncPanel>
          </div>
        </div>
      )}
    </div>
  );
};

const StatusBadge: React.FC<{ label: string; color?: string }> = ({ label, color = "slate" }) => {
  const styles: Record<string, string> = {
    slate: "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400",
    success: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400",
  };
  return (
    <div className={`px-3 py-1 rounded-full border text-[11px] font-bold flex items-center gap-2 shadow-sm font-display ${styles[color]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${color === "success" ? "bg-emerald-500" : "bg-slate-400"}`}></span>
      {label}
    </div>
  );
};

export default Settings;
