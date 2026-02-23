import React, { useState, useRef, useCallback } from "react";
import { Upload, History, Activity, AlertCircle, FileText, Link2, Database, CheckCircle2, FileSpreadsheet, X } from "lucide-react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { AsyncPanel } from "@/components/ui/AsyncPanel";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import api from "@/services/api";
import { track } from "@/lib/analytics";
import { parseFile, readFileAsText, type ParseResult, type ParsedTransaction } from "@/lib/parsers";

interface ImportResponse {
    importedCount?: number;
    message?: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_EXTENSIONS = [".csv", ".ofx", ".qfx", ".txt", ".tsv"];

export default function Imports() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [tab, setTab] = useState<"file" | "sheets">("file");

    // Google Sheets Logic
    const [sheetUrl, setSheetUrl] = useState("");
    const [resultMessage, setResultMessage] = useState<string | null>(null);

    // File Import Logic
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragActive, setDragActive] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [parseResult, setParseResult] = useState<ParseResult | null>(null);
    const [previewData, setPreviewData] = useState<ParsedTransaction[]>([]);

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
            const { data } = await api.post<ImportResponse>("/sync/import", { sheetId });

            const importedCount = data.importedCount ?? 0;
            const msg = data.message ?? `Importacao concluida: ${importedCount} registros processados.`;

            setResultMessage(msg);
            track?.("import_sheets_success", { importedCount });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Erro ao importar planilha.";
            setError(message);
            track?.("import_sheets_error");
        } finally {
            setLoading(false);
        }
    }

    // File handling
    const validateFile = useCallback((file: File): string | null => {
        if (file.size > MAX_FILE_SIZE) {
            return `Arquivo excede o limite de 5MB (${(file.size / 1024 / 1024).toFixed(1)}MB).`;
        }
        const ext = "." + (file.name.split(".").pop()?.toLowerCase() || "");
        if (!ACCEPTED_EXTENSIONS.includes(ext)) {
            return `Formato nao suportado: ${ext}. Formatos aceitos: ${ACCEPTED_EXTENSIONS.join(", ")}`;
        }
        return null;
    }, []);

    const processFile = useCallback(async (file: File) => {
        const validationError = validateFile(file);
        if (validationError) {
            setError(validationError);
            return;
        }

        setSelectedFile(file);
        setError(null);
        setParseResult(null);
        setLoading(true);

        try {
            const content = await readFileAsText(file);
            const result = parseFile(content, file.name);

            setParseResult(result);
            setPreviewData(result.transactions.slice(0, 10));

            if (result.transactions.length === 0) {
                setError("Nenhuma transacao encontrada no arquivo. Verifique o formato.");
            } else {
                setResultMessage(
                    `${result.transactions.length} transacoes encontradas (${result.skippedRows} linhas ignoradas).`
                );
            }

            track?.("import_file_parsed", {
                format: file.name.split(".").pop(),
                transactions: result.transactions.length,
                errors: result.errors.length,
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Erro ao processar arquivo.";
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [validateFile]);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    }, [processFile]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
        const file = e.dataTransfer.files?.[0];
        if (file) processFile(file);
    }, [processFile]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setDragActive(false);
    }, []);

    const handleConfirmImport = async () => {
        if (!parseResult || parseResult.transactions.length === 0) return;

        setLoading(true);
        setError(null);

        try {
            const { data } = await api.post<ImportResponse>("/sync/import-transactions", {
                transactions: parseResult.transactions,
                source: selectedFile?.name || "file-upload",
            });

            const count = data.importedCount ?? parseResult.transactions.length;
            setResultMessage(`Importacao concluida: ${count} transacoes salvas com sucesso!`);
            setParseResult(null);
            setPreviewData([]);
            setSelectedFile(null);

            track?.("import_file_confirmed", { count });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Erro ao salvar transacoes.";
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const handleClearFile = () => {
        setSelectedFile(null);
        setParseResult(null);
        setPreviewData([]);
        setError(null);
        setResultMessage(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
        <div className="space-y-6">
            <SectionHeader
                title="Importar Dados"
                description="Central de sincronizacao e upload de arquivos financeiros."
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
                                    onClick={() => { setTab("file"); handleClearFile(); }}
                                    className={cn(
                                        "px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2",
                                        tab === "file" ? "bg-momentum-accent text-white shadow-sm" : "text-momentum-muted hover:text-momentum-text"
                                    )}
                                >
                                    <Upload className="w-3.5 h-3.5" />
                                    Arquivo
                                </button>
                                <button
                                    onClick={() => { setTab("sheets"); handleClearFile(); }}
                                    className={cn(
                                        "px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2",
                                        tab === "sheets" ? "bg-momentum-accent text-white shadow-sm" : "text-momentum-muted hover:text-momentum-text"
                                    )}
                                >
                                    <Database className="w-3.5 h-3.5" />
                                    Google Sheets
                                </button>
                            </div>
                        </div>

                        {tab === "file" ? (
                            <div className="space-y-4">
                                {/* Drop Zone */}
                                <div
                                    onDrop={handleDrop}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={cn(
                                        "border-2 border-dashed rounded-xl p-10 cursor-pointer",
                                        "flex flex-col items-center justify-center text-center transition-all",
                                        dragActive
                                            ? "border-momentum-accent bg-momentum-accent/10 scale-[1.02]"
                                            : "border-momentum-accent/20 hover:border-momentum-accent/40 bg-momentum-accent/5"
                                    )}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".csv,.ofx,.qfx,.txt,.tsv"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                    />
                                    <div className="w-12 h-12 rounded-full bg-momentum-accent/10 flex items-center justify-center mb-4 text-momentum-accent">
                                        {dragActive ? <Upload className="w-6 h-6 animate-bounce" /> : <FileText className="w-6 h-6" />}
                                    </div>
                                    <p className="text-sm font-medium text-momentum-text mb-1">
                                        {dragActive ? "Solte o arquivo aqui" : "Arraste um arquivo ou clique para selecionar"}
                                    </p>
                                    <p className="text-xs text-momentum-muted">
                                        CSV, OFX, QFX ou TXT (max. 5MB)
                                    </p>
                                </div>

                                {/* Selected File Info */}
                                {selectedFile && (
                                    <div className="flex items-center justify-between p-3 rounded-lg bg-momentum-accent/5 border border-white/10">
                                        <div className="flex items-center gap-3">
                                            <FileSpreadsheet className="w-4 h-4 text-momentum-accent" />
                                            <div>
                                                <p className="text-sm font-medium text-momentum-text">{selectedFile.name}</p>
                                                <p className="text-[11px] text-momentum-muted">
                                                    {(selectedFile.size / 1024).toFixed(1)} KB
                                                </p>
                                            </div>
                                        </div>
                                        <button onClick={handleClearFile} className="p-1 rounded hover:bg-white/10 transition-colors">
                                            <X className="w-4 h-4 text-momentum-muted" />
                                        </button>
                                    </div>
                                )}

                                {/* Parse Errors */}
                                {parseResult && parseResult.errors.length > 0 && (
                                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                        <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">Avisos:</p>
                                        <ul className="text-[11px] text-amber-500 space-y-0.5">
                                            {parseResult.errors.slice(0, 5).map((err, i) => (
                                                <li key={i}>{err}</li>
                                            ))}
                                            {parseResult.errors.length > 5 && (
                                                <li>... e mais {parseResult.errors.length - 5} avisos</li>
                                            )}
                                        </ul>
                                    </div>
                                )}

                                {/* Confirm Import Button */}
                                {parseResult && parseResult.transactions.length > 0 && (
                                    <button
                                        onClick={handleConfirmImport}
                                        disabled={loading}
                                        className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                        {loading ? "Salvando..." : `Confirmar importacao de ${parseResult.transactions.length} transacoes`}
                                    </button>
                                )}
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
                                    * Certifique-se de que a planilha possui cabecalhos reconhecidos (Data, Descricao, Valor, Categoria).
                                </p>
                            </div>
                        )}

                        {/* Error Display */}
                        {error && (
                            <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex gap-3">
                                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                <p className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>
                            </div>
                        )}

                        <div className="mt-6 p-4 rounded-lg bg-slate-500/5 border border-white/5">
                            <div className="flex gap-3">
                                <AlertCircle className="w-4 h-4 text-momentum-accent shrink-0 mt-0.5" />
                                <p className="text-xs text-momentum-muted leading-relaxed line-clamp-2 hover:line-clamp-none cursor-help transition-all">
                                    Formatos suportados: CSV (ponto-e-virgula ou virgula), OFX/QFX (extratos bancarios).
                                    Para performance ideal, recomendamos arquivos com ate 1.000 linhas por vez.
                                </p>
                            </div>
                        </div>
                    </GlassPanel>
                </div>

                {/* Bloco B: Preview / Resultado */}
                <div className="space-y-6">
                    {/* Preview Table */}
                    {previewData.length > 0 && (
                        <GlassPanel className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 rounded-lg bg-momentum-accent/10 text-momentum-accent">
                                    <FileSpreadsheet className="w-5 h-5" />
                                </div>
                                <h2 className="text-lg font-semibold text-momentum-text">Preview</h2>
                                <Badge variant="info">{parseResult?.transactions.length ?? 0} transacoes</Badge>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-slate-50 dark:bg-white/5 text-slate-400 font-bold uppercase tracking-widest text-[9px] border-b border-slate-200 dark:border-white/5">
                                        <tr>
                                            <th className="px-3 py-3">Data</th>
                                            <th className="px-3 py-3">Descricao</th>
                                            <th className="px-3 py-3">Tipo</th>
                                            <th className="px-3 py-3 text-right">Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                        {previewData.map((tx, i) => (
                                            <tr key={i} className="hover:bg-primary/5 transition-colors">
                                                <td className="px-3 py-2 text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">{tx.date}</td>
                                                <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100 truncate max-w-[180px]">{tx.description}</td>
                                                <td className="px-3 py-2">
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded text-[9px] font-bold uppercase",
                                                        tx.type === "credit"
                                                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                                            : "bg-red-500/10 text-red-600 dark:text-red-400"
                                                    )}>
                                                        {tx.type === "credit" ? "Credito" : "Debito"}
                                                    </span>
                                                </td>
                                                <td className={cn(
                                                    "px-3 py-2 text-right font-bold",
                                                    tx.type === "credit" ? "text-emerald-500" : "text-red-500"
                                                )}>
                                                    {tx.type === "debit" ? "-" : ""}R$ {tx.amount.toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {(parseResult?.transactions.length ?? 0) > 10 && (
                                <p className="mt-3 text-[11px] text-momentum-muted text-center">
                                    Mostrando 10 de {parseResult?.transactions.length} transacoes
                                </p>
                            )}
                        </GlassPanel>
                    )}

                    {/* Success Result */}
                    {resultMessage && !parseResult && (
                        <GlassPanel className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                                    <CheckCircle2 className="w-5 h-5" />
                                </div>
                                <h2 className="text-lg font-semibold text-momentum-text">Importacao Concluida</h2>
                            </div>
                            <p className="text-sm text-momentum-muted">{resultMessage}</p>
                        </GlassPanel>
                    )}

                    {/* Empty State */}
                    {!previewData.length && !resultMessage && (
                        <GlassPanel className="p-6 h-full flex items-center justify-center min-h-[300px]">
                            <div className="text-center">
                                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                                    <History className="w-6 h-6 text-slate-400" />
                                </div>
                                <h3 className="text-sm font-medium text-momentum-text mb-1">Nenhum dado carregado</h3>
                                <p className="text-xs text-momentum-muted max-w-xs">
                                    Selecione um arquivo CSV ou OFX para visualizar e importar transacoes.
                                </p>
                            </div>
                        </GlassPanel>
                    )}
                </div>
            </div>
        </div>
    );
}
