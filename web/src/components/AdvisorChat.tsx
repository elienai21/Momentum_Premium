import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { Send, Loader2, Bot, User, Mic, MicOff, Volume2, VolumeX, Trash2 } from "lucide-react";
import { useFeatures } from "../context/FeatureGateContext";
import { resolveVoiceId } from "@/lib/voice";
import { useTTS } from "@/hooks/useTTS";
import { useSTT } from "@/hooks/useSTT";
import { useAuthToken } from "../hooks/useAuthToken";
import api from "@/services/api";
import { cn } from "@/lib/utils";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Badge } from "@/components/ui/Badge";
import { AsyncPanel } from "@/components/ui/AsyncPanel";

type AdvisorMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
};

type AdvisorChatProps = {
  onClose?: () => void;
};

async function advisorSend(messages: Array<{ role: "user" | "assistant"; content: string }>) {
  const r = await api.post("/advisor/session", { messages });
  return r.data as { reply: string };
}

export default function AdvisorChat({ onClose }: AdvisorChatProps) {
  const { features, voiceProfiles } = useFeatures() as any;
  const effectiveFeatures = features || {
    advisor: true,
    voiceTTS: false,
    voiceSTT: false,
  };

  const token = useAuthToken();

  const [messages, setMessages] = useState<AdvisorMessage[]>([
    {
      role: "assistant",
      content:
        "Olá! Sou seu Advisor Momentum. Me conte o que está tirando o sono do seu caixa hoje.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading] = useState(false); // Placeholder if history fetching is added later

  const containerRef = useRef<HTMLDivElement | null>(null);

  const {
    speak,
    stop: stopSpeaking,
    loading: ttsLoading
  } = useTTS();

  const { start, stop, transcript, recording } = useSTT();

  useEffect(() => {
    if (!transcript || transcript === "\u200b") return;
    setInput(transcript);
  }, [transcript]);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const history: AdvisorMessage[] = [
      ...messages,
      { role: "user", content: trimmed, timestamp },
    ];

    setMessages(history);
    setInput("");
    setLoading(true);

    try {
      if (!token) {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content:
              "Você precisa estar autenticado para usar o Advisor. Faça login e tente novamente.",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          },
        ]);
        return;
      }

      const result = await advisorSend(
        history.map((m) => ({
          role: m.role,
          content: m.content,
        })));

      const reply: AdvisorMessage = {
        role: "assistant",
        content: result.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((m) => [...m, reply]);

      if (effectiveFeatures.voiceTTS) {
        await speak({
          text: result.reply,
          voice: resolveVoiceId("neural", voiceProfiles, "advisor")
        });
      }
    } catch (err: any) {
      const errorMsg = err?.code === "NO_CREDITS"
        ? "Você ficou sem créditos de IA neste plano. Atualize seu plano ou aguarde a renovação dos créditos."
        : (err?.message || "Erro ao processar resposta.");

      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: errorMsg,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (ev: KeyboardEvent<HTMLTextAreaElement>) => {
    if (ev.key === "Enter" && !ev.shiftKey) {
      ev.preventDefault();
      void handleSend();
    }
  };

  const handleToggleListening = () => {
    if (!effectiveFeatures.voiceSTT) return;

    if (!recording) {
      setInput("");
      start();
    } else {
      stop();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: "assistant",
        content: "Chat reiniciado. Como posso ajudar agora?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-transparent">
      {/* A) Topo: SectionHeader */}
      <div className="px-6 pt-2 pb-4">
        <SectionHeader
          title="CFO Advisor"
          subtitle="Insights em tempo real para sua gestão financeira."
          actions={
            <div className="flex gap-2">
              <button
                onClick={clearChat}
                className="p-2 rounded-lg hover:bg-momentum-accent/10 text-momentum-muted hover:text-momentum-accent transition-colors"
                title="Limpar conversa"
                aria-label="Limpar conversa"
              >
                <Trash2 size={18} />
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-lg border border-momentum-border text-xs font-medium hover:bg-white transition-all shadow-sm"
                >
                  Fechar
                </button>
              )}
            </div>
          }
        />
      </div>

      {/* B) Corpo: Lista de mensagens */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-6 py-4 space-y-6 scroll-smooth scrollbar-none"
      >
        <AsyncPanel
          isLoading={historyLoading}
          isEmpty={messages.length === 0}
          emptyTitle="Sem mensagens"
          emptyDescription="Inicie uma conversa com seu advisor."
          emptyIcon={<Bot />}
          className="border-none bg-transparent shadow-none p-0"
        >
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={cn(
                "flex w-full mb-6 last:mb-0 animate-in fade-in slide-in-from-bottom-2 duration-300",
                m.role === "assistant" ? "justify-start" : "justify-end"
              )}
            >
              <div className={cn(
                "flex gap-3 max-w-[85%] md:max-w-[75%]",
                m.role === "assistant" ? "flex-row" : "flex-row-reverse"
              )}>
                {/* Avatar Icon */}
                <div className={cn(
                  "hidden sm:flex h-8 w-8 rounded-full items-center justify-center shrink-0 mt-1 shadow-sm",
                  m.role === "assistant"
                    ? "bg-gradient-to-br from-momentum-accent to-blue-600 text-white"
                    : "bg-white border border-momentum-border text-momentum-text"
                )}>
                  {m.role === "assistant" ? <Bot size={16} /> : <User size={16} />}
                </div>

                {/* Message Bubble */}
                <div className="flex flex-col gap-1.5">
                  {m.role === "assistant" ? (
                    <GlassPanel
                      className={cn(
                        "px-4 py-3 rounded-2xl text-[13px] leading-relaxed shadow-sm border-none backdrop-blur-md",
                        "bg-white/80 dark:bg-slate-900/40 rounded-tl-none ring-1 ring-momentum-border/30"
                      )}
                    >
                      <p className="whitespace-pre-wrap text-slate-800 dark:text-slate-200">{m.content}</p>
                    </GlassPanel>
                  ) : (
                    <div className={cn(
                      "px-4 py-3 rounded-2xl text-[13px] leading-relaxed shadow-sm border-none backdrop-blur-md",
                      "bg-primary text-white rounded-tr-none shadow-momentum-glow"
                    )}>
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    </div>
                  )}

                  {m.timestamp && (
                    <span className={cn(
                      "text-[10px] opacity-40 font-semibold uppercase tracking-wider",
                      m.role === "user" ? "text-right" : "text-left"
                    )}>
                      {m.timestamp}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </AsyncPanel>

        {/* Typing state indicator */}
        {loading && (
          <div className="flex justify-start animate-pulse">
            <div className="flex gap-3 items-start">
              <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0 shadow-sm" />
              <GlassPanel className="px-5 py-3 rounded-2xl rounded-tl-none bg-slate-100/50 dark:bg-slate-800/30 border-none shadow-none">
                <div className="flex gap-1.5 items-center h-4">
                  <span className="w-1.5 h-1.5 bg-momentum-muted rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-momentum-muted rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-momentum-muted rounded-full animate-bounce" />
                </div>
              </GlassPanel>
            </div>
          </div>
        )}

        <div className="h-4" /> {/* Extra padding at the bottom */}
      </div>

      {/* C) Input area no rodapé */}
      <div className="px-6 py-4 border-t border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl sticky bottom-0 z-10 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] dark:shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.5)]">
        <div className="max-w-4xl mx-auto space-y-4 pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleListening}
              disabled={!effectiveFeatures.voiceSTT || loading}
              className={cn(
                "flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all",
                recording
                  ? "bg-red-500 text-white shadow-lg animate-pulse"
                  : "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
              )}
              aria-label={recording ? "Parar de ouvir" : "Falar com advisor"}
            >
              {recording ? <MicOff size={14} className="animate-pulse" /> : <Mic size={14} />}
              {recording ? "Ouvindo..." : "Voz"}
            </button>

            {effectiveFeatures.voiceTTS && (
              <button
                onClick={ttsLoading ? stopSpeaking : () => speak({
                  text: messages[messages.length - 1]?.content,
                  voice: resolveVoiceId("neural", voiceProfiles, "advisor")
                })}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                title={ttsLoading ? "Parar leitura" : "Ouvir resposta"}
              >
                {ttsLoading ? <VolumeX size={16} className="text-red-500 animate-pulse" /> : <Volume2 size={16} />}
              </button>
            )}

            <Badge variant="neutral" className="ml-auto text-[9px] font-bold tracking-tighter bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400">Advisor Premium v2</Badge>
          </div>

          <div className="relative flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pergunte sobre seus saldos, categorias ou anomalias..."
                aria-label="Mensagem para o Advisor"
                className={cn(
                  "w-full bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-3.5 pr-14 text-sm leading-relaxed text-slate-900 dark:text-slate-100 placeholder:text-slate-500",
                  "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all",
                  "resize-none min-h-[52px] max-h-36 scrollbar-none shadow-inner"
                )}
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className={cn(
                  "absolute right-2.5 bottom-2.5 h-9 w-9 rounded-xl flex items-center justify-center transition-all shadow-md",
                  loading || !input.trim()
                    ? "bg-slate-800 text-slate-600 shadow-none cursor-not-allowed"
                    : "bg-primary text-white shadow-glow hover:scale-105 active:scale-95"
                )}
                aria-label="Enviar mensagem"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
          </div>

          <p className="text-[10px] text-momentum-muted text-center italic opacity-60">
            Inteligência contextual baseada em seu histórico financeiro real.
          </p>
        </div>
      </div>
    </div>
  );
}
