// web/src/components/SupportDock.tsx
import { useEffect, useRef, useState } from "react";
import {
  MessageCircle,
  X,
  Volume2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { useTTS } from "../hooks/useTTS";
import { useSTT } from "../hooks/useSTT";
import AudioBadge from "./AudioBadge";
import RecordButton from "./RecordButton";
import { track } from "../lib/analytics";
import { useFeatures } from "../context/FeatureGateContext";
import { resolveVoiceId } from "../lib/voice";
import { useAuthToken } from "../hooks/useAuthToken";
import { useSupportChat } from "../hooks/useSupportChat";

export interface SupportDockProps {
  initialOpen?: boolean;
}

export default function SupportDock({ initialOpen = false }: SupportDockProps) {
  const [isOpen, setIsOpen] = useState(initialOpen);

  const token = useAuthToken();
  const { features, voiceProfiles } = useFeatures() as any;

  const isTestEnv = import.meta.env.MODE === "test";
  const hasAuth = !!token || isTestEnv;

  const effectiveFeatures =
    features ??
    ({
      voiceTier: "none",
      voiceTTS: false,
      voiceSTT: false,
    } as const);

  const effectiveVoiceProfiles = voiceProfiles ?? [];

  const resolvedSupportVoice = resolveVoiceId(
    effectiveFeatures.voiceTier,
    effectiveVoiceProfiles,
    "support",
  );

  const panelRef = useRef<HTMLDivElement | null>(null);

  const { messages, isSending, error, noCredits, sendMessage, reset } =
    useSupportChat();

  const [input, setInput] = useState("");

  // Hooks de voz / acessibilidade – sempre chamados na mesma ordem
  const { speak, loading: ttsLoading } = useTTS();
  const { start, stop, recording, transcript } = useSTT();

  useFocusTrap(panelRef as any, isOpen);

  useEffect(() => {
    if (transcript.trim()) setInput(transcript);
  }, [transcript]);

  // Permite abrir o suporte a partir de qualquer tela via evento global
  useEffect(() => {
    function handleOpenRequest() {
      setIsOpen(true);
      track?.("support_open");
    }

    window.addEventListener("open-support-dock", handleOpenRequest);
    return () => {
      window.removeEventListener("open-support-dock", handleOpenRequest);
    };
  }, []);

  function handleToggle() {
    setIsOpen((prev) => {
      const next = !prev;
      if (next) {
        track?.("support_open");
      } else {
        track?.("support_close");
      }
      return next;
    });
  }

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || isSending || !hasAuth || noCredits) return;

    await sendMessage(trimmed);
    setInput("");
  }

  async function readLast() {
    if (!effectiveFeatures.voiceTTS || !hasAuth) return;
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    if (!last) return;
    await speak({
      text: last.content,
      voice: resolvedSupportVoice,
      profile: "tutorial",
    });
  }

  const sendingDisabled = isSending || !hasAuth || noCredits;
  const inputDisabled = !hasAuth || noCredits;

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
      {/* Painel de chat */}
      {isOpen && (
        <div
          ref={panelRef}
          className="flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-2xl transition-all max-h-[70vh] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/90"
          role="dialog"
          aria-modal="false"
          aria-label="Suporte Momentum"
        >
          {/* Cabeçalho */}
          <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-2 dark:border-slate-800/70">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white">
                M
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  Suporte Momentum
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-300">
                  Tire dúvidas sobre como usar o Momentum
                </span>
              </div>
              <AudioBadge
                active={ttsLoading && hasAuth}
                label={
                  effectiveFeatures.voiceTTS && hasAuth
                    ? "Voz ativada"
                    : "Voz desativada"
                }
              />
            </div>
            <div className="flex items-center gap-1">
              {effectiveFeatures.voiceTTS && hasAuth && (
                <button
                  onClick={readLast}
                  className="rounded-lg p-1.5 hover:bg-slate-50 dark:hover:bg-slate-900/70"
                  title="Ler última resposta"
                >
                  <Volume2 className="h-4 w-4 text-slate-600 dark:text-slate-200" />
                </button>
              )}
              <button
                onClick={() => {
                  setIsOpen(false);
                  track?.("support_close");
                }}
                aria-label="Fechar suporte"
                className="rounded-lg p-1.5 hover:bg-slate-50 dark:hover:bg-slate-900/70"
              >
                <X className="h-4 w-4 text-slate-600 dark:text-slate-200" />
              </button>
            </div>
          </div>

          {/* Corpo / mensagens */}
          <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-3 py-2 text-sm">
            {hasAuth ? (
              messages.map((m) => {
                if (m.role === "system") {
                  return (
                    <div
                      key={m.id}
                      className="flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-[11px] text-slate-600 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100"
                    >
                      <HelpCircle className="mt-[2px] h-3.5 w-3.5 text-slate-400 dark:text-slate-300" />
                      <span className="whitespace-pre-line">{m.content}</span>
                    </div>
                  );
                }

                const isAssistant = m.role === "assistant";

                return (
                  <div
                    key={m.id}
                    className={`max-w-[85%] rounded-2xl border px-3 py-2 text-xs whitespace-pre-line ${
                      isAssistant
                        ? "self-start border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
                        : "self-end border-emerald-100 bg-emerald-50 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-600/30 dark:text-emerald-50"
                    }`}
                  >
                    {m.content}
                  </div>
                );
              })
            ) : (
              <div className="flex h-full items-center justify-center px-4 text-center text-xs text-slate-500 dark:text-slate-300">
                Para falar com o suporte Momentum, faça login na sua conta.
              </div>
            )}

            {isSending && hasAuth && !noCredits && (
              <div className="self-start rounded-2xl bg-slate-50 px-3 py-1 text-[11px] text-slate-500 dark:bg-slate-900/70 dark:text-slate-200">
                Digitando…
              </div>
            )}
          </div>

          {/* Mensagem de erro / sem créditos */}
          <div className="flex flex-col gap-1 px-3 pb-2">
            {error && hasAuth && !noCredits && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800 dark:border-amber-400/40 dark:bg-amber-950/40 dark:text-amber-50">
                <AlertCircle className="mt-[2px] h-3.5 w-3.5" />
                <span>{error.message}</span>
              </div>
            )}

            {noCredits && hasAuth && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800 dark:border-amber-400/40 dark:bg-amber-950/40 dark:text-amber-50">
                <AlertCircle className="mt-[2px] h-3.5 w-3.5" />
                <span>
                  Você atingiu o limite de créditos de IA do seu plano para o
                  suporte automatizado. Atualize seu plano ou aguarde a
                  renovação dos créditos para continuar usando este recurso.
                </span>
              </div>
            )}
          </div>

          {/* Input + ações */}
          <div className="flex items-center gap-2 border-t border-slate-200/80 p-3 dark:border-slate-800/70">
            <input
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
              }}
              placeholder={
                hasAuth
                  ? noCredits
                    ? "Sem créditos para enviar mensagens"
                    : "Descreva sua dúvida"
                  : "Faça login para enviar uma dúvida"
              }
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:bg-slate-50 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-50 dark:disabled:bg-slate-900/70 dark:disabled:text-slate-500"
              disabled={inputDisabled}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            {effectiveFeatures.voiceSTT && hasAuth && !noCredits && (
              <RecordButton
                recording={recording}
                onStart={() => {
                  track?.("support_voice_start");
                  start();
                }}
                onStop={() => {
                  track?.("support_voice_stop");
                  stop();
                }}
              />
            )}
            <button
              onClick={handleSend}
              disabled={sendingDisabled}
              className="rounded-xl bg-slate-900 px-3 py-2 text-xs text-white hover:bg-black/90 disabled:opacity-60 dark:bg-emerald-600 dark:hover:bg-emerald-500"
            >
              {isSending ? "Enviando..." : "Enviar"}
            </button>
          </div>

          {/* Ações secundárias */}
          <div className="flex items-center justify-between border-t border-slate-200/80 px-3 py-2 text-[10px] text-slate-400 dark:border-slate-800/70 dark:text-slate-500">
            <button
              type="button"
              className="text-[11px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-100"
              onClick={() => {
                reset();
                track?.("support_reset");
              }}
            >
              Nova conversa
            </button>
            <span className="text-[10px]">
              Suporte automatizado do Momentum
            </span>
          </div>
        </div>
      )}

      {/* Botão flutuante */}
      <button
        type="button"
        onClick={handleToggle}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xl transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-emerald-300"
        aria-label={isOpen ? "Fechar suporte Momentum" : "Abrir suporte Momentum"}
      >
        {isOpen ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </button>
    </div>
  );
}
