import React, { useEffect, useState } from "react";
import { GlassPanel } from "../ui/GlassPanel";
import { AsyncPanel } from "../ui/AsyncPanel";
import { authorizedFetch } from "@/services/authorizedFetch";
import { useToast } from "../Toast";
import { Shield, Clock, User, Activity } from "lucide-react";

interface AuditLog {
    id: string;
    type: string;
    userId: string;
    createdAt: string;
    payload?: {
        description?: string;
        [key: string]: any;
    };
}

export function AuditLogsPanel() {
    const { notify } = useToast();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const res = await authorizedFetch("/api/tenants/audit?limit=50");
            if (!res.ok) throw new Error("Falha ao carregar logs");
            const json = await res.json();
            setLogs(json.data);
        } catch (err: any) {
            console.error(err);
            notify({ type: "error", message: "Erro ao carregar logs de auditoria." });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 font-display flex items-center gap-2">
                        <Shield size={20} className="text-primary" />
                        Logs de Auditoria
                    </h3>
                    <p className="text-sm text-slate-500 font-display">
                        Histórico de ações e segurança do workspace.
                    </p>
                </div>
                <button
                    onClick={fetchLogs}
                    className="text-primary hover:text-primary/80 text-sm font-bold transition-all"
                >
                    Atualizar
                </button>
            </div>

            <AsyncPanel isLoading={loading} isEmpty={logs.length === 0} error={null}>
                <div className="grid gap-3">
                    {logs.map((log) => (
                        <GlassPanel
                            key={log.id}
                            className="p-4 flex items-center justify-between border-slate-200/50 dark:border-white/5"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                    <Activity size={18} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300 font-display">
                                        {log.type}
                                    </p>
                                    <p className="text-xs text-slate-500 max-w-md truncate">
                                        {log.payload?.description || JSON.stringify(log.payload)}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="flex items-center gap-1 justify-end text-xs text-slate-400 mb-1">
                                    <User size={10} />
                                    <span>{log.userId}</span>
                                </div>
                                <div className="flex items-center gap-1 justify-end text-[10px] text-slate-400/70 uppercase tracking-wider">
                                    <Clock size={10} />
                                    <span>{new Date(log.createdAt).toLocaleString()}</span>
                                </div>
                            </div>
                        </GlassPanel>
                    ))}
                </div>
            </AsyncPanel>
        </div>
    );
}
