import React, { useState } from "react";
import { Upload, History, Activity, AlertCircle, FileText, Link2, Database, CheckCircle2 } from "lucide-react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { AsyncPanel } from "@/components/ui/AsyncPanel";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import api from "@/services/api";
import { track } from "@/lib/analytics";

interface ImportResponse {
    importedCount?: number;
    message?: string;
}

export default function Imports() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<any>(null);
    const [tab, setTab] = useState<"file" | "sheets">("sheets"); // Começa em Sheets pois é a única 100% funcional agora

    // Google Sheets Logic (Migrated from ImportModal)
    const [sheetUrl, setSheetUrl] = useState("");
    const [resultMessage, setResultMessage] = useState<string | null>(null);

    function extractSheetId(url: string): string {
        const match = url.match(/\/d\/([^/]+)/);
        return match?.[1] ?? url.trim();
    }

    async function handleSheetsImport() {
        const trimmed = sheetUrl.trim();
        if (!trimmed) return;

        setLoading(true);
        setResultMessage(null);
        setError(null);

        try {
            const sheetId = extractSheetId(trimmed);
            const { data } = await api.post<ImportResponse>("/sync/import", {
                sheetId,
            });

            const importedCount = data.importedCount ?? 0;
            const msg = data.message ?? `Importação concluída: ${importedCount} registros processados.`;

            setResultMessage(msg);
            track?.("import_sheets_success", { importedCount });
        } catch (err: any) {
            console.error("[Imports] Erro Sheets:", err);
            setError(err);
            track?.("import_sheets_error", { status: err?.status });
        } finally {
            setLoading(false);
        }
    }

    const handleSimulatedError = () => {
        setError({
            status: 413,
            message: "O arquivo excede o limite de 5MB. Por favor, divida o arquivo ou remova colunas desnecessárias.",
        });
    };

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Importar Dados"
                description="Central de sincronização e upload de arquivos financeiros."
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Bloco A: Importar Arquivo / Sheets */}
                <div className="space-y-6">
                    <GlassPanel className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-momentum-accent/10 text-momentum-accent">
                                    <Upload className="w-5 h-5" />
                                </div>
                                <h2 className="text-lg font-semibold text-momentum-text">Importar dados</h2>
                            </div>

                            <div className="flex bg-momentum-accent/5 p-1 rounded-lg border border-white/5">
                                <button
                                    onClick={() => setTab("sheets")}
                                    className={cn(
                                        "px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2",
                                        tab === "sheets" ? "bg-momentum-accent text-white shadow-sm" : "text-momentum-muted hover:text-momentum-text"
                                    )}
                                >
                                    <Database className="w-3.5 h-3.5" />
                                    Google Sheets
                                </button>
                                <button
                                    onClick={() => setTab("file")}
                                    className={cn(
                                        "px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2",
                                        tab === "file" ? "bg-momentum-accent text-white shadow-sm" : "text-momentum-muted hover:text-momentum-text"
                                    )}
                                >
                                    <Upload className="w-3.5 h-3.5" />
                                    Arquivo
                                </button>
                            </div>
                        </div>

                        {tab === "file" ? (
                            <div
                                className={cn(
                                    "border-2 border-dashed border-momentum-accent/20 rounded-xl p-10",
                                    "flex flex-col items-center justify-center text-center transition-colors",
                                    "hover:border-momentum-accent/40 bg-momentum-accent/5"
                                )}
                            >
                                <div className="w-12 h-12 rounded-full bg-momentum-accent/10 flex items-center justify-center mb-4 text-momentum-accent">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <p className="text-sm font-medium text-momentum-text mb-1">
                                    Arraste um arquivo ou clique para selecionar
                                </p>
                                <p className="text-xs text-momentum-muted mb-6">
                                    CSV, XLSX ou PDF (máx. 5MB)
                                </p>

                                <div className="flex flex-col gap-3 w-full max-w-xs">
                                    <button
                                        type="button"
                                        disabled
                                        className="w-full py-2.5 px-4 rounded-xl bg-momentum-accent text-white font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Selecionar arquivo
                                    </button>
                                    <div className="flex items-center justify-center gap-2">
                                        <Badge variant="warn">Em breve</Badge>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-medium text-momentum-text">URL da Planilha Google</label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-momentum-muted" />
                                            <input
                                                type="url"
                                                value={sheetUrl}
                                                onChange={(e) => setSheetUrl(e.target.value)}
                                                placeholder="https://docs.google.com/spreadsheets/d/..."
                                                className="w-full bg-momentum-accent/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-momentum-text outline-none focus:ring-2 focus:ring-momentum-accent/50"
                                            />
                                        </div>
                                        <button
                                            onClick={handleSheetsImport}
                                            disabled={loading || !sheetUrl.trim()}
                                            className="px-4 py-2 rounded-xl bg-momentum-accent text-white text-sm font-medium hover:bg-momentum-accent/90 transition-colors disabled:opacity-50"
                                        >
                                            {loading ? "Sincronizando..." : "Sincronizar"}
                                        </button>
                                    </div>
                                </div>

                                {resultMessage && !error && (
                                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex gap-3">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{resultMessage}</p>
                                    </div>
                                )}

                                <p className="text-[11px] text-momentum-muted leading-relaxed italic">
                                    * Certifique-se de que a planilha possui cabeçalhos reconhecidos (Data, Descrição, Valor, Categoria).
                                </p>
                            </div>
                        )}

                        <div className="mt-6 p-4 rounded-lg bg-slate-500/5 border border-white/5">
                            <div className="flex gap-3">
                                <AlertCircle className="w-4 h-4 text-momentum-accent shrink-0 mt-0.5" />
                                <p className="text-xs text-momentum-muted leading-relaxed line-clamp-2 hover:line-clamp-none cursor-help transition-all">
                                    Para performance ideal, recomendamos arquivos com até 1.000 linhas por vez.
                                    Arquivos maiores que 5MB serão rejeitados pelo sistema.
                                </p>
                            </div>
                        </div>

                        {import.meta.env.DEV && (
                            <button
                                onClick={handleSimulatedError}
                                className="mt-4 text-[10px] text-momentum-muted opacity-30 hover:opacity-100 transition-opacity"
                            >
                                [Dev] Simular erro 413 (Payload Too Large)
                            </button>
                        )}
                    </GlassPanel>

                    {/* Bloco B: Status */}
                    <AsyncPanel
                        loading={loading && tab === "sheets"}
                        error={error}
                        isEmpty={!loading && !resultMessage}
                        emptyConfig={{
                            title: "Aguardando importação",
                            description: "Nenhum processamento ativo no momento.",
                            icon: Activity
                        }}
                    >
                        <GlassPanel className="p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 rounded-lg bg-momentum-accent/10 text-momentum-accent">
                                    <Activity className="w-5 h-5" />
                                </div>
                                <h2 className="text-lg font-semibold text-momentum-text">Status do Processamento</h2>
                            </div>

                            {loading && (
                                <div className="flex flex-col gap-4 animate-pulse">
                                    <div className="h-4 bg-momentum-accent/10 rounded w-3/4" />
                                    <div className="h-2 bg-momentum-accent/5 rounded w-full" />
                                    <div className="h-2 bg-momentum-accent/5 rounded w-1/2" />
                                </div>
                            )}

                            {resultMessage && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-3 rounded-lg bg-momentum-accent/5 border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <Database className="w-4 h-4 text-momentum-accent" />
                                            <span className="text-sm font-medium text-momentum-text">Sincronização Finalizada</span>
                                        </div>
                                        <Badge variant="success">Sucesso</Badge>
                                    </div>
                                    <p className="text-xs text-momentum-muted">{resultMessage}</p>
                                </div>
                            )}
                        </GlassPanel>
                    </AsyncPanel>
                </div>

                {/* Bloco C: Histórico */}
                <div className="h-full">
                    <AsyncPanel
                        loading={false}
                        isEmpty={true}
                        emptyConfig={{
                            title: "Nenhum histórico encontrado",
                            description: "Você ainda não realizou nenhuma importação neste tenant.",
                            icon: History,
                            action: (
                                <button className="px-4 py-2 bg-momentum-accent/10 text-momentum-accent rounded-lg text-xs font-medium hover:bg-momentum-accent/20 transition-all">
                                    Iniciar importação
                                </button>
                            )
                        }}
                    >
                        <GlassPanel className="p-6 h-full">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-momentum-accent/10 text-momentum-accent">
                                        <History className="w-5 h-5" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-momentum-text">Histórico de Importações</h2>
                                </div>
                            </div>
                            {/* Tabela de histórico viria aqui */}
                        </GlassPanel>
                    </AsyncPanel>
                </div>
            </div>
        </div>
    );
}
