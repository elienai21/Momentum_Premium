// web/src/components/CfoVoiceButton.tsx
import React, { useState } from "react";
import { useVoiceCFO } from "../hooks/useVoiceCFO";
import { Mic, PhoneOff, Loader2 } from "lucide-react";

export const CfoVoiceButton: React.FC = () => {
  const {
    status,
    error,
    lastAssistantMessage,
    currentAssistantText,
    connect,
    disconnect,
    sendText,
  } = useVoiceCFO();

  const [userInput, setUserInput] = useState("");

  const isConnecting = status === "connecting";
  const isReady = status === "ready";

  const handleToggle = () => {
    if (isReady) {
      disconnect();
    } else {
      connect();
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;
    sendText(userInput.trim());
    setUserInput("");
  };

  const assistantDisplay =
    currentAssistantText || lastAssistantMessage || "";

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white/90 px-3 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-brand-1 to-brand-2 text-xs font-semibold text-white shadow-md">
            CFO
          </span>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-50">
              CFO Live (beta)
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Converse em tempo real sobre seu caixa e decisões.
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggle}
          disabled={isConnecting}
          className={[
            "inline-flex items-center justify-center rounded-xl px-3 py-1.5 text-xs font-medium",
            "transition-all duration-200",
            isReady
              ? "bg-rose-600 text-white hover:bg-rose-700"
              : "bg-emerald-600 text-white hover:bg-emerald-700",
          ].join(" ")}
        >
          {isConnecting ? (
            <>
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              Conectando...
            </>
          ) : isReady ? (
            <>
              <PhoneOff className="mr-1 h-3.5 w-3.5" />
              Encerrar CFO Live
            </>
          ) : (
            <>
              <Mic className="mr-1 h-3.5 w-3.5" />
              Falar com o CFO
            </>
          )}
        </button>
      </div>

      {/* Campo de texto rápido (modo chat) */}
      {isReady && (
        <form onSubmit={handleSend} className="mt-3 flex gap-2">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Pergunte algo sobre caixa, runway, custos..."
            className="flex-1 rounded-xl border border-slate-200 bg-white/90 px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-1 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100"
          />
          <button
            type="submit"
            className="rounded-xl bg-brand-1 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-2"
          >
            Enviar
          </button>
        </form>
      )}

      {/* Última resposta do CFO */}
      {assistantDisplay && (
        <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Última resposta do CFO
          </span>
          <p className="whitespace-pre-wrap leading-snug line-clamp-4">
            {assistantDisplay}
          </p>
        </div>
      )}

      {/* Erro compacto */}
      {error && (
        <p className="mt-2 text-[11px] text-rose-500">
          {error}
        </p>
      )}

      {/* Status em modo discreto (bom para mobile) */}
      <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
        Status:{" "}
        {status === "idle" && "aguardando conexão"}
        {status === "connecting" && "conectando..."}
        {status === "ready" && "conectado"}
        {status === "closed" && "sessão encerrada"}
        {status === "error" && "erro de conexão"}
      </p>
    </div>
  );
};
