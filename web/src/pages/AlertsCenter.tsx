import React, { useState, useMemo } from "react";
import {
    Bell,
    Search,
    Filter,
    CheckCheck,
    AlertTriangle,
    Info,
    Clock,
    ArrowUpDown
} from "lucide-react";
import { useAlerts } from "../hooks/useAlerts";
import { SectionHeader } from "../components/ui/SectionHeader";
import { GlassPanel } from "../components/ui/GlassPanel";
import { InsightCard } from "../components/ui/InsightCard";
import { InsightList } from "../components/ui/InsightList";
import { EmptyState } from "../components/ui/EmptyState";
import { SkeletonPanel } from "../components/ui/SkeletonPanel";
import { Badge } from "../components/ui/Badge";
import { cn } from "../lib/utils";

export default function AlertsCenter() {
    const { data: alerts = [], isLoading, error, markAsRead } = useAlerts();
    const [searchTerm, setSearchTerm] = useState("");
    const [filterSeverity, setFilterSeverity] = useState<string>("all");
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [sortBy, setSortBy] = useState<"date" | "severity">("date");

    const filteredAlerts = useMemo(() => {
        return alerts
            .filter((alert) => {
                const matchesSearch =
                    alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    alert.message.toLowerCase().includes(searchTerm.toLowerCase());
                const matchesSeverity = filterSeverity === "all" || alert.severity === filterSeverity;
                const matchesStatus = filterStatus === "all" || alert.status === filterStatus;
                return matchesSearch && matchesSeverity && matchesStatus;
            })
            .sort((a, b) => {
                if (sortBy === "date") {
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                } else {
                    const priority = { high: 3, medium: 2, low: 1 };
                    return priority[b.severity] - priority[a.severity];
                }
            });
    }, [alerts, searchTerm, filterSeverity, filterStatus, sortBy]);

    const handleMarkAllRead = async () => {
        const unreadIds = alerts.filter(a => a.status === 'unread').map(a => a.id);
        for (const id of unreadIds) {
            await markAsRead(id);
        }
    };

    const getSeverityVariant = (severity: string) => {
        switch (severity) {
            case "high": return "danger";
            case "medium": return "warn";
            default: return "info";
        }
    };

    return (
        <div className="space-y-8 pb-20 fade-in" aria-live="polite">
            <SectionHeader
                title="Centro de Alertas"
                subtitle="Monitore anomalias, vencimentos e mudanças importantes na sua saúde financeira."
                actions={
                    <div className="flex gap-2">
                        <button
                            onClick={handleMarkAllRead}
                            className="px-4 py-2 bg-momentum-bg/50 border border-momentum-border rounded-lg text-xs font-medium text-momentum-text hover:bg-momentum-bg transition-all flex items-center gap-2"
                        >
                            <CheckCheck size={14} /> Marcar todos como lidos
                        </button>
                    </div>
                }
            />

            {/* Toolbar */}
            <GlassPanel className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-2.5 text-momentum-muted" size={16} />
                    <input
                        type="text"
                        placeholder="Buscar alertas..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-momentum-bg/50 border border-momentum-border rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-momentum-accent outline-none transition-all text-momentum-text placeholder:text-momentum-muted/70"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-2 bg-momentum-bg/30 p-1 rounded-lg border border-momentum-border">
                        <Filter size={14} className="ml-2 text-momentum-muted" />
                        <select
                            value={filterSeverity}
                            onChange={(e) => setFilterSeverity(e.target.value)}
                            className="bg-transparent text-xs text-momentum-text outline-none pr-2"
                        >
                            <option value="all">Severidade: Todas</option>
                            <option value="high">Alta</option>
                            <option value="medium">Média</option>
                            <option value="low">Baixa</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2 bg-momentum-bg/30 p-1 rounded-lg border border-momentum-border">
                        <Clock size={14} className="ml-2 text-momentum-muted" />
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="bg-transparent text-xs text-momentum-text outline-none pr-2"
                        >
                            <option value="all">Status: Todos</option>
                            <option value="unread">Não lidos</option>
                            <option value="read">Lidos</option>
                        </select>
                    </div>

                    <button
                        onClick={() => setSortBy(prev => prev === "date" ? "severity" : "date")}
                        className="p-2 bg-momentum-bg/50 border border-momentum-border rounded-lg text-momentum-muted hover:text-momentum-accent transition-all flex items-center gap-2"
                        title="Alternar ordenação"
                    >
                        <ArrowUpDown size={14} />
                        <span className="text-xs font-medium uppercase font-display">{sortBy === "date" ? "Data" : "Nível"}</span>
                    </button>
                </div>
            </GlassPanel>

            {/* Content */}
            <div className="grid grid-cols-1 gap-6">
                {isLoading ? (
                    <InsightList>
                        {[1, 2, 3, 4].map(i => <SkeletonPanel key={i} className="h-24" />)}
                    </InsightList>
                ) : error ? (
                    <EmptyState
                        icon={<AlertTriangle size={48} className="text-momentum-danger" />}
                        title="Erro ao carregar alertas"
                        description="Não conseguimos sincronizar com o servidor de notificações."
                        action={<button onClick={() => window.location.reload()} className="px-6 py-2 bg-momentum-accent text-white rounded-lg font-medium">Tentar novamente</button>}
                    />
                ) : filteredAlerts.length === 0 ? (
                    <EmptyState
                        icon={<Bell size={48} className="text-momentum-muted" />}
                        title="Sem alertas no momento"
                        description={searchTerm || filterSeverity !== 'all' || filterStatus !== 'all' ? "Nenhum alerta corresponde aos seus filtros atuais." : "Você está em dia! Nenhuma anomalia financeira detectada."}
                        action={searchTerm || filterSeverity !== 'all' || filterStatus !== 'all' ? <button onClick={() => { setSearchTerm(""); setFilterSeverity("all"); setFilterStatus("all"); }} className="text-momentum-accent hover:underline text-sm font-medium">Limpar filtros</button> : undefined}
                    />
                ) : (
                    <InsightList>
                        {filteredAlerts.map((alert) => (
                            <InsightCard
                                key={alert.id}
                                title={alert.title}
                                description={alert.message}
                                severity={getSeverityVariant(alert.severity) as any}
                                className={cn(alert.status === 'read' && "opacity-60 saturate-50 hover:opacity-100 hover:saturate-100")}
                                actions={
                                    <div className="flex items-center justify-between w-full">
                                        <span className="text-[10px] text-momentum-muted flex items-center gap-1">
                                            <Clock size={10} />
                                            {new Date(alert.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        {alert.status === 'unread' && (
                                            <button
                                                onClick={() => markAsRead(alert.id)}
                                                className="text-[10px] font-bold text-momentum-accent hover:underline uppercase tracking-tighter"
                                            >
                                                Marcar como lido
                                            </button>
                                        )}
                                    </div>
                                }
                            />
                        ))}
                    </InsightList>
                )}
            </div>
        </div>
    );
}
