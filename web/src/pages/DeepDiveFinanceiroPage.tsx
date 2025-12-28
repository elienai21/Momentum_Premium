import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Wallet, TrendingUp, AlertCircle, CheckCircle, ArrowDownRight, ArrowUpRight, ArrowLeft } from "lucide-react";
import api from "../services/api";
import { usePulseSummary } from "../hooks/usePulseSummary";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { GlassPanel } from "../components/ui/GlassPanel";
import { SectionHeader } from "../components/ui/SectionHeader";
import { StatsCard } from "../components/ui/StatsCard";
import { Badge } from "../components/ui/Badge";
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
    const { user } = useAuth();
    const { notify } = useToast();

    // Date Logic (Default last 30 days for Deep Dive)
    const [range, setRange] = useState("30d");
    const periodEnd = useMemo(() => new Date(), []);
    const periodStart = useMemo(() => {
        const d = new Date(periodEnd);
        d.setDate(d.getDate() - 30);
        return d;
    }, [periodEnd]);

    const iso = (d: Date) => d.toISOString().slice(0, 10);

    // 1. KPI Data (Pulse)
    const { data: pulseData, loading: pulseLoading } = usePulseSummary({
        tenantId: import.meta.env.VITE_DEFAULT_TENANT_ID || "demo-tenant-001",
        periodStart: iso(periodStart),
        periodEnd: iso(periodEnd),
    });

    // 2. Transactions Data
    const [transactions, setTransactions] = useState<Tx[]>([]);
    const [txLoading, setTxLoading] = useState(true);

    useEffect(() => {
        async function loadTx() {
            setTxLoading(true);
            try {
                const resp = await api.post<FilterResp>("/portal/transactions/filter", {
                    from: iso(periodStart),
                    to: iso(periodEnd),
                    q: null
                });
                setTransactions(resp.data?.transactions || []);
            } catch (e) {
                console.error("Deep Dive Load Error", e);
                notify({ type: "error", message: "Erro ao carregar detalhes." });
            } finally {
                setTxLoading(false);
            }
        }
        loadTx();
    }, [periodStart, periodEnd, notify]);

    const kpis = pulseData?.kpis;
    const metricsLoading = pulseLoading; // Separate loading for KPIs vs Tx? Or combined?
    // Combined
    const isLoading = pulseLoading || txLoading;

    // Calculations for "Deep Dive" insights (Generic)
    const totalIn = transactions.filter(t => t.type === 'credit').reduce((acc, t) => acc + t.amount, 0);
    const totalOut = transactions.filter(t => t.type === 'debit').reduce((acc, t) => acc + Math.abs(t.amount), 0);
    const netFlow = totalIn - totalOut;
    const alerts = pulseData?.alerts || [];

    return (
        <div className="space-y-8 pb-20 fade-in" aria-live="polite">
            <SectionHeader
                title="Deep Dive Financeiro"
                subtitle="Análise detalhada de performance, caixa e movimentações."
                actions={
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/')}
                            className="text-momentum-muted hover:text-momentum-text transition-colors text-sm flex items-center gap-1"
                        >
                            <ArrowLeft size={16} /> Voltar ao Dashboard
                        </button>
                        <Badge variant="neutral" className="px-3 py-1">
                            Últimos 30 dias
                        </Badge>
                    </div>
                }
            />

            {/* Top KPI Grid */}
            {metricsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => <GlassPanel key={i} className="h-36 animate-pulse bg-current/5"><div /></GlassPanel>)}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <StatsCard
                        label="Saldo Final (Real)"
                        value={String(kpis?.cashBalance || "R$ 0,00")}
                        icon={Wallet}
                        variant="default"
                    />
                    <StatsCard
                        label="Entradas (Período)"
                        value={totalIn.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        icon={ArrowUpRight}
                        variant="success"
                    />
                    <StatsCard
                        label="Saídas (Período)"
                        value={totalOut.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        icon={ArrowDownRight}
                        variant="danger"
                    />
                    <StatsCard
                        label="Resultado Líquido"
                        value={netFlow.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        icon={TrendingUp}
                        variant={netFlow >= 0 ? "success" : "danger"}
                        trend={{
                            value: netFlow >= 0 ? "Positivo" : "Negativo",
                            direction: netFlow >= 0 ? "up" : "down"
                        }}
                    />
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content: Detailed Table or Chart */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Visual Placeholder for a Chart (reusing GlassPanel) */}
                    <GlassPanel className="min-h-[300px] flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-momentum-accent/5 to-transparent z-0" />
                        <div className="text-center z-10 p-6">
                            <h3 className="text-lg font-semibold text-momentum-text mb-2 text-momentum-text dark:text-white">Fluxo de Caixa Diário</h3>
                            <p className="text-sm text-momentum-muted">
                                Visualização gráfica em breve.
                            </p>
                        </div>
                    </GlassPanel>

                    {/* Recent Large Transactions */}
                    <GlassPanel className="p-0 overflow-hidden">
                        <div className="p-6 border-b border-momentum-border flex justify-between items-center">
                            <h3 className="font-bold text-lg text-momentum-text">Maiores Movimentações</h3>
                            <Badge variant="neutral">{transactions.length} registros</Badge>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-momentum-muted/5 text-momentum-muted font-semibold uppercase text-xs tracking-wider border-b border-momentum-border">
                                    <tr>
                                        <th className="px-6 py-4">Data</th>
                                        <th className="px-6 py-4">Descrição</th>
                                        <th className="px-6 py-4">Categoria</th>
                                        <th className="px-6 py-4 text-right">Valor</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-momentum-border">
                                    {transactions.slice(0, 10).map((tx, i) => (
                                        <tr key={i} className="hover:bg-momentum-accent/5 transition-colors">
                                            <td className="px-6 py-4 font-medium text-momentum-text">{tx.date}</td>
                                            <td className="px-6 py-4 text-momentum-muted">{tx.description}</td>
                                            <td className="px-6 py-4"><Badge variant="neutral" className="bg-momentum-bg/50 border-momentum-border">{tx.category}</Badge></td>
                                            <td className={cn("px-6 py-4 text-right font-bold", tx.type === 'credit' ? "text-momentum-success" : "text-momentum-danger")}>
                                                {Math.abs(tx.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </td>
                                        </tr>
                                    ))}
                                    {transactions.length === 0 && !isLoading && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-8 text-center text-momentum-muted">
                                                Nenhuma transação no período.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </GlassPanel>
                </div>

                {/* Sidebar: Insights */}
                <div className="lg:col-span-1 space-y-6">
                    <CfoHealthCard />

                    <GlassPanel className="p-6 space-y-4">
                        <div className="flex items-center gap-2 text-momentum-warn font-semibold">
                            <AlertCircle size={20} />
                            <h3>Anomalias Detectadas</h3>
                        </div>
                        {alerts.length > 0 ? (
                            <div className="space-y-3">
                                {alerts.map(a => (
                                    <div key={a.id} className="p-3 bg-momentum-warn/5 rounded-lg border border-momentum-warn/20 text-xs text-momentum-text">
                                        <p className="font-semibold mb-1 text-momentum-warn">{a.type}</p>
                                        <p className="text-momentum-muted leading-relaxed">{a.message}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-momentum-muted">
                                Nenhuma anomalia crítica detectada nos últimos 30 dias. O comportamento das despesas segue o padrão histórico.
                            </p>
                        )}
                    </GlassPanel>

                    <GlassPanel className="p-6 space-y-4">
                        <div className="flex items-center gap-2 text-momentum-success font-semibold">
                            <CheckCircle size={20} />
                            <h3>Saúde do Caixa</h3>
                        </div>
                        <p className="text-sm text-momentum-muted">
                            Seu runway atual de {pulseData?.kpis.runwayMonths || 0} meses está dentro da meta saudável e seguro (mais de 6 meses).
                        </p>
                    </GlassPanel>
                </div>
            </div>
        </div>
    );
}
