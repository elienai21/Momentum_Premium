
import React, { useEffect, useState } from "react";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { AsyncPanel } from "@/components/ui/AsyncPanel";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { getEconomics, EconomicsData } from "@/services/adminApi";
import { BarChart3, DollarSign, Users, Activity, ShieldAlert, Plus, MessagesSquare } from "lucide-react";
import { useToast } from "@/components/Toast";
import { InviteMemberModal } from "@/components/settings/InviteMemberModal";
import AdvisorDock from "@/components/AdvisorDock";

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

export default function AdminDashboard() {
    const [data, setData] = useState<EconomicsData | null>(null);
    const [loading, setLoading] = useState(true);
    const { notify } = useToast();
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);
    const [advisorOpen, setAdvisorOpen] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const res = await getEconomics();
            setData(res);
        } catch (err) {
            console.error(err);
            notify({ type: "error", message: "Erro ao carregar dados do admin." });
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 4 }).format(val);
    };

    const chartData = {
        labels: Object.keys(data?.dailyCost || {}).sort().slice(-14), // Last 14 days
        datasets: [
            {
                label: 'Custo Diário de IA ($)',
                data: Object.keys(data?.dailyCost || {}).sort().slice(-14).map(date => data?.dailyCost[date]),
                backgroundColor: 'rgba(124, 58, 237, 0.5)', // Violet-600
                borderColor: 'rgba(124, 58, 237, 1)',
                borderWidth: 1,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: { position: 'top' as const, labels: { color: '#94a3b8' } }, // slate-400
            title: { display: false },
        },
        scales: {
            y: {
                ticks: { color: '#94a3b8' },
                grid: { color: 'rgba(255, 255, 255, 0.05)' }
            },
            x: {
                ticks: { color: '#94a3b8' },
                grid: { display: false }
            }
        }
    };

    // KPIs
    // Estimativa de Receita: MRR simplificado (Active Tenants * $49 - ticket medio ficticio por enquanto)
    const revenueEst = (data?.activeTenantsCount || 0) * 49;
    const margin = revenueEst > 0 ? ((revenueEst - (data?.totalEstimatedCost || 0)) / revenueEst) * 100 : 0;

    return (
        <div className="pt-24 pb-24 space-y-8 animate-in fade-in duration-500">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <ShieldAlert size={20} className="text-violet-500" />
                        <span className="text-xs font-bold text-violet-500 uppercase tracking-widest font-display">Admin Power Pack</span>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-100 font-display">Unit Economics</h1>
                    <p className="text-slate-400 font-display">Monitoramento de custos de IA e saúde financeira.</p>
                </div>
                <div className="flex gap-3 items-center">
                    <button
                        type="button"
                        onClick={() => setCreateModalOpen(true)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-600 text-white text-xs font-semibold shadow-glow hover:bg-violet-500 transition"
                    >
                        <Plus size={14} /> Criar Empresa
                    </button>
                    <button
                        type="button"
                        onClick={() => setAdvisorOpen(true)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-slate-200 text-xs font-semibold hover:bg-slate-800 transition"
                    >
                        <MessagesSquare size={14} /> Falar com Advisor
                    </button>
                    <div className="px-3 py-1 bg-slate-800 rounded-full border border-slate-700 text-xs text-slate-400 font-mono hidden md:block">
                        v1.0.0
                    </div>
                </div>
            </div>

            <AsyncPanel isLoading={loading} error={null} isEmpty={false}>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <AdminStatCard
                        label="Custo Total IA (30d)"
                        value={formatCurrency(data?.totalEstimatedCost || 0)}
                        icon={DollarSign}
                        trend="needs_attn"
                    />
                    <AdminStatCard
                        label="Receita Est. (MRR)"
                        value={`$${revenueEst.toFixed(2)}`}
                        icon={Activity}
                        trend="neutral"
                    />
                    <AdminStatCard
                        label="Margem Bruta Est."
                        value={`${margin.toFixed(1)}%`}
                        icon={BarChart3}
                        trend={margin > 70 ? "positive" : "negative"}
                    />
                    <AdminStatCard
                        label="Tokens Processados"
                        value={new Intl.NumberFormat("en-US", { notation: "compact" }).format(data?.totalTokens || 0)}
                        icon={Users}
                        trend="neutral"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Chart Section */}
                    <div className="lg:col-span-2">
                        <GlassPanel className="p-6 h-full border-slate-800 bg-slate-950/50">
                            <h3 className="text-lg font-bold text-slate-200 mb-6 font-display">Tendência de Custo Diário</h3>
                            <div className="h-[300px] w-full">
                                {data && <Bar data={chartData} options={chartOptions} />}
                            </div>
                        </GlassPanel>
                    </div>

                    {/* Top Spenders Table */}
                    <div className="lg:col-span-1">
                        <GlassPanel className="p-0 h-full border-slate-800 bg-slate-950/50 overflow-hidden">
                            <div className="p-4 border-b border-slate-800/50 bg-slate-900/50 flex justify-between items-center">
                                <h3 className="text-sm font-bold text-slate-200 font-display uppercase tracking-wider">Top Spenders</h3>
                                <span className="text-[10px] text-slate-500">Últimos 30 dias</span>
                            </div>
                            <div className="overflow-y-auto max-h-[350px]">
                                <table className="w-full text-left text-xs">
                                    <tbody className="divide-y divide-slate-800/50">
                                        {data?.topSpenders.map((tenant, i) => (
                                            <tr key={tenant.tenantId} className="hover:bg-slate-800/30 transition-colors">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="font-mono text-slate-500 text-[10px]">#{i + 1}</div>
                                                        <div>
                                                            <div className="font-bold text-slate-200">{tenant.name}</div>
                                                            <div className="text-[10px] text-slate-500">{tenant.plan} • {tenant.tenantId.substring(0, 6)}...</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="font-mono font-bold text-violet-400">{formatCurrency(tenant.cost)}</div>
                                                    <div className="text-[10px] text-slate-500">{(tenant.tokens / 1000).toFixed(1)}k toks</div>
                                                </td>
                                            </tr>
                                        ))}
                                        {(!data?.topSpenders || data.topSpenders.length === 0) && (
                                            <tr><td colSpan={2} className="p-8 text-center text-slate-500">Sem dados</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </GlassPanel>
                    </div>

                </div>

            </AsyncPanel>

            {isCreateModalOpen && (
                <InviteMemberModal
                    onClose={() => setCreateModalOpen(false)}
                    onSuccess={() => setCreateModalOpen(false)}
                />
            )}
            <AdvisorDock open={advisorOpen} onClose={() => setAdvisorOpen(false)} />
        </div>
    );
}

function AdminStatCard({ label, value, icon: Icon, trend }: { label: string, value: string, icon: any, trend: "positive" | "negative" | "neutral" | "needs_attn" }) {
    const colors = {
        positive: "text-emerald-500",
        negative: "text-rose-500",
        neutral: "text-slate-400",
        needs_attn: "text-amber-500" // for costs
    };

    return (
        <GlassPanel className="p-5 border-slate-800 bg-slate-950/50 flex flex-col justify-between h-32 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none group-hover:bg-violet-500/10 transition-colors"></div>
            <div className="flex justify-between items-start relative z-10">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-display">{label}</span>
                <Icon size={16} className="text-slate-600" />
            </div>
            <div className={`text-2xl font-black font-display tracking-tight relative z-10 ${colors[trend] || "text-slate-200"}`}>
                {value}
            </div>
        </GlassPanel>
    );
}
