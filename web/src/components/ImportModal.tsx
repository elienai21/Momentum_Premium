import { useState } from "react";
import api from "@/services/api";
import { track } from "../lib/analytics";

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  // opcional: callback pra quem quiser refazer o fetch do Pulse depois
  onImported?: (summary?: { importedCount?: number }) => void;
}

interface ImportResponse {
  importedCount?: number;
  message?: string;
}

export function ImportModal({ open, onClose, onImported }: ImportModalProps) {
  const [sheetUrl, setSheetUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<"sheets" | "file">("sheets");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const serviceAccountEmail =
    import.meta.env.VITE_FIREBASE_CLIENT_EMAIL ||
    `${import.meta.env.VITE_FIREBASE_PROJECT_ID || "seu-projeto"}@appspot.gserviceaccount.com`;

  if (!open) return null;

  function extractSheetId(url: string): string {
    // MVP: pega o trecho entre /d/ e / (ex.: https://docs.google.com/spreadsheets/d/ID/edit)
    const match = url.match(/\/d\/([^/]+)/);
    return match?.[1] ?? url.trim();
  }

  async function handleImport() {
    if (mode === "file") {
      if (!selectedFile) {
        setErrorMessage("Selecione um arquivo para importar.");
        return;
      }
      return handleFileUpload(selectedFile);
    }

    const trimmed = sheetUrl.trim();
    if (!trimmed) {
      setErrorMessage("Cole a URL da planilha para importar.");
      return;
    }

    setLoading(true);
    setResultMessage(null);
    setErrorMessage(null);

    try {
      const sheetId = extractSheetId(trimmed);

      const { data } = await api.post<ImportResponse>("/sync/import", {
        sheetId,
      });

      const importedCount = data.importedCount ?? 0;

      const msg =
        data.message ??
        `Importação concluída com sucesso. Foram importados ${importedCount} registros.`;

      setResultMessage(msg);
      track?.("import_success", { importedCount });

      if (onImported) {
        onImported({ importedCount });
      }
    } catch (err: any) {
      console.error("[ImportModal] Erro ao importar:", err);

      const apiMessage =
        err?.status === 403
          ? "Permissão negada. Compartilhe a planilha com o e-mail do robô antes de importar."
          : err?.message ||
            "Não foi possível importar a planilha. Verifique a URL e tente novamente.";

      setErrorMessage(apiMessage);
      track?.("import_error", { status: err?.status });
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(file: File) {
    setLoading(true);
    setResultMessage(null);
    setErrorMessage(null);
    try {
      // MVP: apenas confirma o upload localmente; a API será integrada depois.
      const sizeKb = Math.max(1, Math.round(file.size / 1024));
      setResultMessage(`Arquivo "${file.name}" pronto para processamento (${sizeKb} KB).`);
      track?.("import_file_ready", { name: file.name, size: file.size });
      if (onImported) onImported();
    } catch (err) {
      console.error("[ImportModal] Falha ao processar arquivo:", err);
      setErrorMessage("Não foi possível ler o arquivo. Tente novamente ou envie um CSV/OFX válido.");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    // opcional: limpar estado ao fechar
    setSheetUrl("");
    setResultMessage(null);
    setErrorMessage(null);
    setSelectedFile(null);
    setMode("sheets");
    setLoading(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="glass max-w-md w-full rounded-2xl p-4 shadow-xl border border-white/10">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <h2 className="text-base md:text-lg font-semibold">
              Importar dados financeiros
            </h2>
            <p className="text-xs md:text-sm text-slate-500 mt-1">
              Envie sua planilha do Google Sheets ou um arquivo (CSV/XLSX/OFX). O Momentum importará
              as transações para o seu tenant atual.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-200 text-sm px-2"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <div className="flex gap-2 mb-3 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode("sheets")}
            className={`px-3 py-1.5 rounded-lg border ${mode === "sheets" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-slate-50 border-slate-200 text-slate-500"}`}
          >
            Google Sheets
          </button>
          <button
            type="button"
            onClick={() => setMode("file")}
            className={`px-3 py-1.5 rounded-lg border ${mode === "file" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-slate-50 border-slate-200 text-slate-500"}`}
          >
            Upload de Arquivo
          </button>
        </div>

        {mode === "sheets" && (
          <>
            <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
              ⚠️ Importante: compartilhe a planilha com o robô{" "}
              <strong>{serviceAccountEmail}</strong> como <em>Editor</em> antes de importar.
            </div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              URL da planilha
            </label>
            <input
              type="url"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500/60 bg-white/60"
            />
            <p className="text-[11px] text-slate-400 mb-3">
              Dica: verifique se a planilha está compartilhada com permissão de leitura para o serviço
              conectado, ou se o token do Google foi configurado corretamente.
            </p>
          </>
        )}

        {mode === "file" && (
          <div className="space-y-3 mb-2">
            <p className="text-[11px] text-slate-500">
              Envie um arquivo CSV, XLSX ou OFX com suas transações. O processamento será iniciado assim
              que você confirmar.
            </p>
            <input
              type="file"
              accept=".csv,.xlsx,.ofx"
              onChange={(e) => {
                const file = e.target.files?.[0];
                setSelectedFile(file ?? null);
                setResultMessage(null);
                setErrorMessage(null);
              }}
              className="w-full text-xs"
            />
            {selectedFile && (
              <div className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                Arquivo selecionado: <strong>{selectedFile.name}</strong>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 mb-2">
          <button
            type="button"
            onClick={handleClose}
            className="text-xs md:text-sm px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleImport}
            className="text-xs md:text-sm px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={
              loading ||
              (mode === "sheets" ? !sheetUrl.trim() : !selectedFile)
            }
          >
            {loading ? "Importando..." : "Importar"}
          </button>
        </div>

        {errorMessage && (
          <div className="mt-2 text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {errorMessage}
          </div>
        )}

        {resultMessage && (
          <div className="mt-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
            {resultMessage}
          </div>
        )}
      </div>
    </div>
  );
}

export default ImportModal;
