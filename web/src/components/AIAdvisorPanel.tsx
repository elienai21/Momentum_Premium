// ============================================================
// Momentum AI Advisor Panel � v9.3 (light + dark refinado)
// ============================================================

import React, { useRef, useState } from "react";
import { useFeatures } from "@/context/FeatureGateContext";
import { resolveVoiceId } from "@/lib/voice";
import { useTTS } from "@/hooks/useTTS";
import { useAuthToken } from "../hooks/useAuthToken";
import api from "@/services/api";
import { useAuth } from "../context/AuthContext";

type AdvisorReply = { answer: string };
type AdvisorResponse = { ok: boolean; reply: AdvisorReply };

// Base da API: usa env de produ��o (/api) ou cai em /api por padr�o

async function advisorSend(message: string) {
  const r = await api.post("/advisor/session", { messages: [{ role: "user", content: message }] });
  return r.data as AdvisorResponse;
}

export const AIAdvisorPanel: React.FC = () => {
  const { user, loading } = useAuth();
  const [messages, setMessages] = useState<
    Array<{ role: "user" | "assistant"; text: string }>
  >([
    {
      role: "assistant",
      text: "Ol�! Sou seu consultor financeiro com IA. Como posso ajudar hoje?",
    },
  ]);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const { features, voiceProfiles } = useFeatures();
  const token = useAuthToken();
  const { speak } = useTTS();

  const effectiveFeatures =
    features ?? ({
      voiceTier: "none",
      voiceTTS: false,
      voiceSTT: false,
    } as const);

  const effectiveVoiceProfiles = voiceProfiles ?? [];

  const resolvedAdvisorVoice = resolveVoiceId(
    effectiveFeatures.voiceTier,
    effectiveVoiceProfiles,
    "advisor",
  );

  if (loading) {
    return (
      <div className="p-4 text-xs text-slate-400">
        Conectando ao Advisor...
      </div>
    );
  }

  if (!user || !token) {
    return null;
  }

  async function sendText() {
    const text = (inputRef.current?.value || "").trim();
    if (!text || pending) return;

    if (inputRef.current) {
      inputRef.current.value = "";
    }

    setMessages((m) => [
      ...m,
      { role: "user", text },
      { role: "assistant", text: "Pensando�" },
    ]);
    setPending(true);

    try {
      const data = await advisorSend(text);

      const answer =
        data.reply?.answer ||
        "Sem resposta no momento. Tente reformular sua pergunta.";
      setMessages((m) =>
        m.slice(0, -1).concat({ role: "assistant", text: answer }),
      );

      if (effectiveFeatures.voiceTTS) {
        await speak({
          text: answer,
          voice: resolvedAdvisorVoice,
          profile: "aconselhamento",
        });
      }
    } catch (err) {
      console.error("Erro no advisorSend:", err);
      setMessages((m) =>
        m
          .slice(0, -1)
          .concat({
            role: "assistant",
            text:
              "Erro ao processar resposta. Tente novamente em instantes.",
          }),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <aside
      className={[
        // Container base
        "rounded-3xl p-4 md:p-5 flex flex-col gap-3 shadow-xl",
        // Borda / background
        "border border-slate-200 bg-white/95 text-slate-900",
        // Dark: card com gradient escuro, texto claro
        "dark:border-white/8 dark:bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.92),_rgba(3,7,18,0.98))] dark:text-[var(--text-1)] dark:backdrop-blur-xl",
        // Estado de carregando
        loading ? "opacity-60 pointer-events-none" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <header className="flex items-center justify-between gap-2">
        <div>
          <div className="text-xs font-semibold tracking-wide text-[var(--brand-1)]/90 uppercase">
            Momentum AI Advisor
          </div>
          <div className="text-sm text-slate-600 dark:text-white/80">
            Fa�a perguntas em linguagem natural sobre seu neg�cio.
          </div>
        </div>

        <div className="flex flex-col items-end text-[10px] text-slate-500 dark:text-white/60">
          <span>
            Voz:{" "}
            {effectiveFeatures.voiceTTS ? resolvedAdvisorVoice : "desativada"}
          </span>
          {pending && <span className="animate-pulse">Pensando�</span>}
        </div>
      </header>

      <div className="text-[11px] text-slate-600 dark:text-white/70 flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${
            pending ? "bg-[var(--brand-2)] animate-ping" : "bg-emerald-500"
          }`}
        />
        {pending
          ? "Analisando seus dados e hist�rico financeiro�"
          : "Pronto para responder perguntas sobre caixa, margem, cen�rios e riscos."}
      </div>

      <div
        className="flex-1 overflow-y-auto space-y-2 pr-1 text-sm scrollbar-thin scrollbar-thumb-[var(--brand-1)]/40"
        aria-live="polite"
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={[
              "rounded-xl border px-3 py-2 backdrop-blur-sm text-sm",
              m.role === "user"
                ? "border-emerald-100 bg-emerald-50 text-slate-900 dark:border-cyan-400/20 dark:bg-cyan-400/5 dark:text-[var(--text-1)]"
                : "border-slate-200 bg-slate-50 text-slate-900 dark:border-white/8 dark:bg-white/5 dark:text-[var(--text-1)]",
            ].join(" ")}
          >
            <span className="opacity-70 mr-1">
              {m.role === "user" ? "??" : "??"}
            </span>
            <span
              className="align-middle"
              dangerouslySetInnerHTML={{
                __html: m.text.replace(/\//g, "<br/>"),
              }}
            />
          </div>
        ))}
      </div>

      <div className="flex gap-2 mt-1">
        <textarea
          ref={inputRef}
          placeholder="Digite sua pergunta para o Advisor�"
          className="flex-1 rounded-xl border border-slate-300 bg-white p-2 min-h-[44px] max-h-[120px] text-sm text-slate-900 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-[var(--brand-1)]/40 dark:border-white/10 dark:bg-black/20 dark:text-white dark:placeholder:text-white/40"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void sendText();
            }
          }}
        />

        <button
          onClick={sendText}
          disabled={pending}
          className={[
            "rounded-xl px-3 py-2 text-sm font-medium transition-all",
            "border border-slate-900/10 bg-slate-900 text-white hover:bg-black hover:-translate-y-px hover:shadow-lg",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15",
          ].join(" ")}
        >
          {pending ? "�" : "Enviar"}
        </button>
      </div>
    </aside>
  );
};



