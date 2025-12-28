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
import { useAuth } from "../context/AuthContext";
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

    // 1. KPI Data (Pulse)
    const { data: pulseData, loading: pulseLoading, error: pulseError, refetch: refetchPulse } = usePulseSummary({
        tenantId: import.meta.env.VITE_DEFAULT_TENANT_ID || "demo-tenant-001",
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
        loadTx();
    }, [periodStart, periodEnd]);

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
        <div className="space-y-8 pb-20 fade-in" aria-live="polite">
            <SectionHeader
                title="Deep Dive Financeiro"
                subtitle="Análise detalhada de performance, caixa e movimentações."
                actions={
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleBack}
                            className="bg-white border border-momentum-border text-momentum-muted hover:text-momentum-text px-4 py-2 rounded-xl transition-all text-sm font-medium flex items-center gap-2 shadow-sm"
                        >
                            <ArrowLeft size={16} /> Voltar
                        </button>
                        <Badge variant="neutral" className="px-3 py-1 bg-white/50">
                            Últimos 30 dias
                        </Badge>
                    </div>
                }
            />

            {/* Top KPI Grid */}
            <AsyncPanel
                isLoading={pulseLoading || txLoading}
                error={pulseError || txError}
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
                    <GlassPanel className="min-h-[320px] flex items-center justify-center relative overflow-hidden border-none shadow-xl bg-gradient-to-br from-white/40 to-white/10">
                        <div className="absolute inset-0 bg-gradient-to-br from-momentum-accent/5 to-transparent z-0" />
                        <div className="text-center z-10 p-6">
                            <h3 className="text-lg font-bold text-momentum-text mb-2">Fluxo de Caixa Diário</h3>
                            <p className="text-sm text-momentum-muted mb-4 max-w-xs mx-auto">
                                Visualização gráfica interativa em processamento. Disponível em breve para análise de tendência.
                            </p>
                            <Badge variant="neutral" className="animate-pulse">Aguardando IA</Badge>
                        </div>
                    </GlassPanel>

                    {/* Transaction List with Search */}
                    <GlassPanel className="p-0 overflow-hidden border-none shadow-xl bg-white/50 backdrop-blur-xl">
                        <div className="p-6 border-b border-momentum-border/50 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/20">
                            <div>
                                <h3 className="font-bold text-lg text-momentum-text">Movimentações Detalhadas</h3>
                                <p className="text-xs text-momentum-muted">Cruzamento de dados bancários e categorias</p>
                            </div>

                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-momentum-muted" />
                                <input
                                    type="text"
                                    placeholder="Buscar transações..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-white/50 border border-momentum-border rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-momentum-accent/20 focus:border-momentum-accent transition-all"
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
                                    <thead className="bg-slate-50/50 text-momentum-muted font-bold uppercase text-[10px] tracking-widest border-b border-momentum-border/50">
                                        <tr>
                                            <th className="px-6 py-4">Data</th>
                                            <th className="px-6 py-4">Descrição</th>
                                            <th className="px-6 py-4">Categoria</th>
                                            <th className="px-6 py-4 text-right">Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-momentum-border/30">
                                        {filteredTransactions.map((tx, i) => (
                                            <tr key={i} className="hover:bg-momentum-accent/5 transition-colors group">
                                                <td className="px-6 py-4 text-momentum-muted whitespace-nowrap">{tx.date}</td>
                                                <td className="px-6 py-4 font-medium text-momentum-text group-hover:text-momentum-accent transition-colors">
                                                    {tx.description}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge variant="neutral" className="bg-white/50 border-momentum-border/50 text-[10px]">
                                                        {tx.category}
                                                    </Badge>
                                                </td>
                                                <td className={cn(
                                                    "px-6 py-4 text-right font-bold",
                                                    tx.type === 'credit' ? "text-momentum-success" : "text-momentum-text"
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

                    <GlassPanel className="p-6 space-y-6 border-none shadow-lg bg-white/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-momentum-warn/10 text-momentum-warn">
                                <AlertCircle size={20} />
                            </div>
                            <h3 className="font-bold text-momentum-text">Anomalias de Fluxo</h3>
                        </div>

                        <AsyncPanel isLoading={pulseLoading} error={pulseError} loadingVariant="skeleton" className="border-none bg-transparent p-0 shadow-none">
                            {alerts.length > 0 ? (
                                <div className="space-y-4">
                                    {alerts.map(a => (
                                        <div key={a.id} className="p-4 bg-momentum-warn/5 rounded-xl border border-momentum-warn/10 text-sm">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-momentum-warn">{a.type}</span>
                                                <Badge variant="warn" className="scale-75 origin-right">Pendente</Badge>
                                            </div>
                                            <p className="text-momentum-text font-medium leading-relaxed">{a.message}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-6">
                                    <div className="w-12 h-12 rounded-full bg-momentum-success/10 flex items-center justify-center mx-auto mb-3">
                                        <CheckCircle className="w-6 h-6 text-momentum-success" />
                                    </div>
                                    <p className="text-sm text-momentum-muted">
                                        Nenhuma anomalia crítica detectada nos últimos 30 dias.
                                    </p>
                                </div>
                            )}
                        </AsyncPanel>
                    </GlassPanel>

                    <GlassPanel className="p-6 space-y-4 border-none shadow-lg bg-momentum-accent/5 border-l-4 border-l-momentum-accent">
                        <h3 className="text-sm font-bold text-momentum-accent uppercase tracking-widest">Saúde Operacional</h3>
                        <p className="text-sm text-momentum-text leading-relaxed">
                            Seu runway atual de <span className="font-bold">{pulseData?.kpis.runwayMonths || 0} meses</span> está dentro da meta saudável e seguro (mais de 6 meses).
                        </p>
                        <div className="pt-2">
                            <button className="text-[10px] font-bold text-momentum-accent hover:underline uppercase tracking-wider">Ver plano de expansão</button>
                        </div>
                    </GlassPanel>
                </div>
            </div>
        </div>
    );
}
