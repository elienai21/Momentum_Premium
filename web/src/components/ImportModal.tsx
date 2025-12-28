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

  if (!open) return null;

  function extractSheetId(url: string): string {
    // MVP: pega o trecho entre /d/ e / (ex.: https://docs.google.com/spreadsheets/d/ID/edit)
    const match = url.match(/\/d\/([^/]+)/);
    return match?.[1] ?? url.trim();
  }

  async function handleImport() {
    const trimmed = sheetUrl.trim();
    if (!trimmed) return;

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

      // Com o interceptor do api.ts, o erro vem como { status, message }
      const apiMessage =
        err?.message ||
        "Não foi possível importar a planilha. Verifique a URL e tente novamente.";

      setErrorMessage(apiMessage);
      track?.("import_error", { status: err?.status });
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    // opcional: limpar estado ao fechar
    setSheetUrl("");
    setResultMessage(null);
    setErrorMessage(null);
    setLoading(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="glass max-w-md w-full rounded-2xl p-4 shadow-xl border border-white/10">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <h2 className="text-base md:text-lg font-semibold">
              Importar dados do Google Sheets
            </h2>
            <p className="text-xs md:text-sm text-slate-500 mt-1">
              Cole a URL da planilha com seus dados financeiros. O Momentum vai
              importar as transações para o seu tenant atual.
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
          Dica: verifique se a planilha está compartilhada com permissão de
          leitura para o serviço conectado, ou se o token do Google foi
          configurado corretamente.
        </p>

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
            disabled={loading || !sheetUrl.trim()}
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
