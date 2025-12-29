import React from "react";
import { useCredits } from "@/hooks/useCredits";
import { useTenant as useTenantCtx } from "@/context/TenantContext";
import { useTenant as useTenantData } from "@/hooks/useTenant";
import { Card } from "@/components/Card";
import Topbar from "@/components/Topbar";
import { Shield, CreditCard, Sparkles, RefreshCw, Zap, ExternalLink } from "lucide-react";

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
  const { tenantId } = useTenantCtx();
  const tenant = useTenantData(tenantId);

  const quota = credits?.monthlyQuota || 0;
  const available = credits?.available || 0;
  const used = credits?.used || 0;
  const percent = quota > 0 ? Math.min(100, Math.max(0, (available / quota) * 100)) : 0;

  const planName = (credits?.planNormalized || (tenant as any)?.plan || "Starter").toUpperCase();
  const renewsAt = formatDate(credits?.renewsAt);
  const periodSource = credits?.periodSource === "stripe" ? "Ciclo de Faturamento" : "Ciclo de 30 dias";

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Topbar />

      <main className="p-6 md:ml-64 pt-24 max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* Header Seção */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Preferências da Conta</h1>
            <p className="text-slate-500 text-sm">Gerencie seu plano, faturamento e créditos de IA do Momentum.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Card Principal de Plano */}
          <Card className="md:col-span-2 overflow-hidden border-none shadow-xl shadow-blue-500/5 bg-gradient-to-br from-white to-slate-50">
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
                  <Shield size={24} />
                </div>
                <div>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Seu Plano Atual</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-slate-900">{planName}</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase">Ativo</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-white border border-slate-100 shadow-sm space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Próxima renovação</span>
                  <p className="font-semibold text-slate-700">{renewsAt}</p>
                </div>
                <div className="p-4 rounded-xl bg-white border border-slate-100 shadow-sm space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Método de faturamento</span>
                  <div className="flex items-center gap-2 text-slate-700">
                    <CreditCard size={14} className="text-slate-400" />
                    <p className="font-semibold text-sm italic">Cartão final **** 4242</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex flex-wrap gap-3">
                <button className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-all shadow-md active:scale-95 flex items-center gap-2">
                  Alterar Plano
                  <RefreshCw size={16} />
                </button>
                <button className="px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition-all flex items-center gap-2">
                  Gerenciar Faturamento
                  <ExternalLink size={16} />
                </button>
              </div>
            </div>
          </Card>

          {/* Mini Card de Info do Tenant */}
          <Card className="p-6 border-slate-200/60 bg-white">
            <h3 className="font-bold text-slate-900 mb-4 tracking-tight">Dados da Organização</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest text-[9px]">Nome do Tenant</label>
                <p className="text-slate-700 font-bold text-sm">{tenant?.name || "Minha Empresa"}</p>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest text-[9px]">Workspace ID</label>
                <code className="text-[11px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-mono block truncate">{tenantId || "---"}</code>
              </div>
              <div className="pt-4 border-t border-slate-100">
                <button className="text-xs text-blue-600 hover:text-blue-700 font-bold uppercase tracking-wider">Editar Perfil Empresa</button>
              </div>
            </div>
          </Card>
        </div>

        {/* --- SEÇÃO DE CRÉDITOS --- */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Sparkles size={20} className="text-blue-500 fill-blue-500/20" />
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Créditos de IA &amp; Automação</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* Visualização de Uso */}
            <Card className="lg:col-span-2 p-6 flex flex-col md:flex-row gap-8 bg-white border-slate-200/60 transition-all hover:shadow-lg">
              <div className="flex-1 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-sm text-slate-500 font-bold tracking-tight">Uso no Período Atual</p>
                    <p className="text-[11px] text-slate-400 italic">Baseado no {periodSource}</p>
                  </div>
                  <button
                    onClick={() => refetch()}
                    className="p-2 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-blue-600 transition-colors"
                    title="Recarregar"
                  >
                    <RefreshCw size={16} className={loadingCredits ? "animate-spin" : ""} />
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-end justify-between">
                    <span className="text-4xl font-black text-slate-900 tracking-tighter">
                      {formatNumber(available)}
                      <span className="text-lg font-normal text-slate-400 ml-1">restantes</span>
                    </span>
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                      Cota: {formatNumber(quota)}
                    </span>
                  </div>
                  <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden p-1 border border-slate-100 shadow-inner">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${percent > 40 ? "bg-gradient-to-r from-blue-500 to-indigo-600" :
                          percent > 15 ? "bg-amber-500" : "bg-red-500"
                        }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400 tracking-widest pt-1 px-1">
                    <span>Início: {formatDate(credits?.lastResetAt)}</span>
                    <span>Renova em: {renewsAt}</span>
                  </div>
                </div>
              </div>

              <div className="w-full md:w-56 p-5 rounded-2xl bg-blue-50/50 border border-blue-100 flex flex-col justify-center gap-3">
                <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
                  <Zap size={16} className="fill-blue-700 underline underline-offset-2" />
                  <span>Dica Momentum</span>
                </div>
                <p className="text-[11px] text-blue-800 leading-relaxed font-medium">
                  Relatórios avançados consomem 20 créditos. O Health Score diário utiliza apenas 5.
                </p>
                <button className="text-[11px] font-bold text-blue-700 mt-2 hover:bg-white/50 px-2 py-1 rounded transition-colors w-fit border border-blue-200">
                  VER TABELA DE CUSTOS
                </button>
              </div>
            </Card>

            {/* CTAs / Upgrades */}
            <Card className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 border-none p-6 text-white shadow-xl shadow-indigo-500/20 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                  <Sparkles size={20} className="fill-white/20" />
                </div>
                <h3 className="font-bold text-xl leading-tight tracking-tight">Precisa de mais Inteligência?</h3>
                <p className="text-indigo-100 text-[13px] leading-relaxed">Adicione pacotes extras de 1.000 créditos ou migre para o Plano Business e ganhe quota ilimitada.</p>
              </div>
              <button className="mt-6 w-full py-3 rounded-xl bg-white text-indigo-700 font-bold hover:bg-slate-50 transition-all shadow-lg active:scale-95 text-sm uppercase tracking-wider">
                Ver Opções de Upgrade
              </button>
            </Card>

          </div>
        </div>

      </main>
    </div>
  );
};

export default Settings;
