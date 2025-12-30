import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
    Wallet,
    TrendingUp,
    AlertCircle,
    CheckCircle,
    ArrowDownRight,
    ArrowUpRight,
    ArrowLeft,
    Search,
    Download
} from "lucide-react";
import api from "../services/api";
import { usePulseSummary } from "../hooks/usePulseSummary";
import { getFriendlyError } from "../lib/errorMessages";
import { useAuth } from "../context/AuthContext";
import { useTenant } from "../context/TenantContext";
import { useToast } from "../components/Toast";
import { GlassPanel } from "../components/ui/GlassPanel";
import { SectionHeader } from "../components/ui/SectionHeader";
import { StatsCard } from "../components/ui/StatsCard";
import { Badge } from "../components/ui/Badge";
import { AsyncPanel } from "../components/ui/AsyncPanel";
import { cn } from "../lib/utils";
import { CfoHealthCard } from "../components/CfoHealthCard";

interface Tx {
    date: string;
    description: string;
    category: string;
    type: "credit" | "debit";
    amount: number;
}

interface FilterResp {
    transactions: Tx[];
}

export default function DeepDiveFinanceiroPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const { tenantId } = useTenant();
    const { notify } = useToast();

    // Search state
    const [searchTerm, setSearchTerm] = useState("");

    // Date Logic (Default last 30 days for Deep Dive)
    const periodEnd = useMemo(() => new Date(), []);
    const periodStart = useMemo(() => {
        const d = new Date(periodEnd);
        d.setDate(d.getDate() - 30);
        return d;
    }, [periodEnd]);

    const iso = (d: Date) => d.toISOString().slice(0, 10);

    // Resolved Tenant ID (Auth Context primarily)
    const resolvedTenantId = useMemo(() => tenantId ?? "", [tenantId]);

    // 1. KPI Data (Pulse)
    const { data: pulseData, loading: pulseLoading, error: pulseError, empty: pulseEmpty, refetch: refetchPulse } = usePulseSummary({
        tenantId: resolvedTenantId,
        periodStart: iso(periodStart),
        periodEnd: iso(periodEnd),
    });

    // 2. Transactions Data
    const [transactions, setTransactions] = useState<Tx[]>([]);
    const [txLoading, setTxLoading] = useState(true);
    const [txError, setTxError] = useState<any>(null);

    const loadTx = async () => {
        setTxLoading(true);
        setTxError(null);
        try {
            const resp = await api.post<FilterResp>("/portal/transactions/filter", {
                from: iso(periodStart),
                to: iso(periodEnd),
                q: null
            });
            setTransactions(resp.data?.transactions || []);
        } catch (e: any) {
            console.error("Deep Dive Load Error", e);
            setTxError(e);
            notify({ type: "error", message: "Erro ao carregar detalhes." });
        } finally {
            setTxLoading(false);
        }
    };

    useEffect(() => {
        if (!resolvedTenantId) {
            setTransactions([]);
            setTxLoading(false);
            return;
        }
        loadTx();
    }, [periodStart, periodEnd, resolvedTenantId]);

    // Local Search filtering
    const filteredTransactions = useMemo(() => {
        if (!searchTerm.trim()) return transactions;
        const low = searchTerm.toLowerCase();
        return transactions.filter(t =>
            t.description.toLowerCase().includes(low) ||
            t.category.toLowerCase().includes(low) ||
            t.amount.toString().includes(low) ||
            t.date.includes(low)
        );
    }, [transactions, searchTerm]);

    const kpis = pulseData?.kpis;
    const alerts = pulseData?.alerts || [];

    // Calculations for metrics
    const totals = useMemo(() => {
        const inflow = transactions.filter(t => t.type === 'credit').reduce((acc, t) => acc + t.amount, 0);
        const outflow = transactions.filter(t => t.type === 'debit').reduce((acc, t) => acc + Math.abs(t.amount), 0);
        return { inflow, outflow, net: inflow - outflow };
    }, [transactions]);

    const handleBack = () => {
        // If we have a state or specific logic, use it, otherwise fallback to dashboard or previous
        if (location.pathname.startsWith("/advisor")) {
            navigate("/advisor");
        } else {
            navigate(-1);
        }
    };

    return (
        <div className="pt-24 space-y-8 pb-20 fade-in" aria-live="polite">
            {!resolvedTenantId && (
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-sm font-display">
                    Selecione ou crie um tenant para visualizar os detalhes financeiros.
                </div>
            )}

            <SectionHeader
                title="Deep Dive Financeiro"
                subtitle="Análise detalhada de performance, caixa e movimentações."
                actions={
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleBack}
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white px-4 py-2 rounded-xl transition-all text-sm font-medium flex items-center gap-2 shadow-sm font-display"
                        >
                            <ArrowLeft size={16} /> Voltar
                        </button>
                        <Badge variant="neutral" className="px-3 py-1 bg-white/50 dark:bg-slate-800/50">
                            Últimos 30 dias
                        </Badge>
                    </div>
                }
            />

            {/* Top KPI Grid */}
            <AsyncPanel
                isLoading={pulseLoading || txLoading}
                error={pulseError || txError ? getFriendlyError(pulseError || txError) : null}
                isEmpty={!pulseLoading && !txLoading && (pulseEmpty || transactions.length === 0)}
                emptyTitle="Sem dados"
                emptyDescription="Não encontramos dados financeiros suficientes para gerar o Deep Dive. Importe/conecte transações e tente novamente."
                onRetry={() => { refetchPulse(); loadTx(); }}
                className="border-none bg-transparent shadow-none"
                loadingVariant="skeleton"
            >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <StatsCard
                        label="Saldo Final (Real)"
                        value={String(kpis?.cashBalance || "R$ 0,00")}
                        icon={Wallet}
                        variant="default"
                    />
                    <StatsCard
                        label="Entradas (Período)"
                        value={totals.inflow.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        icon={ArrowUpRight}
                        variant="success"
                    />
                    <StatsCard
                        label="Saídas (Período)"
                        value={totals.outflow.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        icon={ArrowDownRight}
                        variant="danger"
                    />
                    <StatsCard
                        label="Resultado Líquido"
                        value={totals.net.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        icon={TrendingUp}
                        variant={totals.net >= 0 ? "success" : "danger"}
                        trend={{
                            value: totals.net >= 0 ? "Positivo" : "Negativo",
                            direction: totals.net >= 0 ? "up" : "down"
                        }}
                    />
                </div>
            </AsyncPanel>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content: Detailed Table or Chart */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Visual Placeholder for a Chart */}
                    <GlassPanel className="min-h-[320px] flex items-center justify-center relative overflow-hidden border border-slate-200/50 dark:border-white/5 shadow-xl bg-white/50 dark:bg-slate-900/80 backdrop-blur-xl">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent z-0" />
                        <div className="text-center z-10 p-6">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2 font-display">Fluxo de Caixa Diário</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 max-w-xs mx-auto font-display">
                                Visualização gráfica interativa em processamento. Disponível em breve para análise de tendência.
                            </p>
                            <Badge variant="neutral" className="animate-pulse">Aguardando IA</Badge>
                        </div>
                    </GlassPanel>

                    {/* Transaction List with Search */}
                    <GlassPanel className="p-0 overflow-hidden border border-slate-200/50 dark:border-white/5 shadow-xl bg-white/50 dark:bg-slate-900/80 backdrop-blur-xl">
                        <div className="p-6 border-b border-slate-200/50 dark:border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50 dark:bg-slate-800/50">
                            <div>
                                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200 font-display">Movimentações Detalhadas</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-display">Cruzamento de dados bancários e categorias</p>
                            </div>

                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar transações..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-display"
                                />
                            </div>
                        </div>

                        <AsyncPanel
                            isLoading={txLoading}
                            error={txError}
                            isEmpty={filteredTransactions.length === 0}
                            emptyTitle="Nenhuma transação"
                            emptyDescription={searchTerm ? "Nenhum resultado para sua busca." : "Sem movimentações no período."}
                            className="min-h-[400px]"
                        >
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-widest border-b border-slate-200/50 dark:border-white/5">
                                        <tr>
                                            <th className="px-6 py-4 font-display">Data</th>
                                            <th className="px-6 py-4 font-display">Descrição</th>
                                            <th className="px-6 py-4 font-display">Categoria</th>
                                            <th className="px-6 py-4 text-right font-display">Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                        {filteredTransactions.map((tx, i) => (
                                            <tr key={i} className="hover:bg-primary/5 transition-colors group">
                                                <td className="px-6 py-4 text-slate-500 dark:text-slate-400 whitespace-nowrap font-display">{tx.date}</td>
                                                <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors font-display">
                                                    {tx.description}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge variant="neutral" className="bg-slate-100 dark:bg-slate-800 border-slate-200/50 dark:border-white/5 text-[10px]">
                                                        {tx.category}
                                                    </Badge>
                                                </td>
                                                <td className={cn(
                                                    "px-6 py-4 text-right font-bold font-display",
                                                    tx.type === 'credit' ? "text-success" : "text-slate-800 dark:text-slate-200"
                                                )}>
                                                    {tx.type === 'debit' ? "-" : ""}{Math.abs(tx.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </AsyncPanel>
                    </GlassPanel>
                </div>

                {/* Sidebar: Insights & Health */}
                <div className="lg:col-span-1 space-y-8">
                    <CfoHealthCard />

                    <GlassPanel className="p-6 space-y-6 border border-slate-200/50 dark:border-white/5 shadow-lg bg-white/50 dark:bg-slate-900/80">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-warning/10 text-warning">
                                <AlertCircle size={20} />
                            </div>
                            <h3 className="font-bold text-slate-800 dark:text-slate-200 font-display">Anomalias de Fluxo</h3>
                        </div>

                        <AsyncPanel isLoading={pulseLoading} error={pulseError} loadingVariant="skeleton" className="border-none bg-transparent p-0 shadow-none">
                            {alerts.length > 0 ? (
                                <div className="space-y-4">
                                    {alerts.map(a => (
                                        <div key={a.id} className="p-4 bg-warning/5 rounded-xl border border-warning/10 text-sm">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-warning font-display">{a.type}</span>
                                                <Badge variant="warn" className="scale-75 origin-right">Pendente</Badge>
                                            </div>
                                            <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed font-display">{a.message}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-6">
                                    <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
                                        <CheckCircle className="w-6 h-6 text-success" />
                                    </div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 font-display">
                                        Nenhuma anomalia crítica detectada nos últimos 30 dias.
                                    </p>
                                </div>
                            )}
                        </AsyncPanel>
                    </GlassPanel>

                    <GlassPanel className="p-6 space-y-4 border border-slate-200/50 dark:border-white/5 shadow-lg bg-primary/5 dark:bg-primary/10 border-l-4 border-l-primary">
                        <h3 className="text-sm font-bold text-primary uppercase tracking-widest font-display">Saúde Operacional</h3>
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-display">
                            Seu runway atual de <span className="font-bold">{pulseData?.kpis.runwayMonths || 0} meses</span> está dentro da meta saudável e seguro (mais de 6 meses).
                        </p>
                        <div className="pt-2">
                            <button className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider font-display">Ver plano de expansão</button>
                        </div>
                    </GlassPanel>
                </div>
            </div>
        </div>
    );
}
