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
  const [sttStatus, setSttStatus] = useState<
    "idle" | "listening" | "processing"
  >("idle");

  const containerRef = useRef<HTMLDivElement | null>(null);

  const {
    speak,
    speaking,
    stop: stopSpeaking,
  } = useTTS({
    voiceId: resolveVoiceId(voiceProfiles, "advisor"),
  });

  const { start, stop, transcript } = useSTT({
    onTranscription: (text) => {
      if (text) {
        setInput(text);
      }
    },
    onStart: () => setSttStatus("listening"),
    onStop: () => setSttStatus("idle"),
  });

  useEffect(() => {
    if (!transcript) return;
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
        await speak(result.reply);
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

    if (sttStatus === "idle") {
      setInput("");
      setSttStatus("listening");
      start();
    } else {
      setSttStatus("processing");
      stop();
    }
  };

  const isListening = sttStatus === "listening";

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
          subtitle="Análise inteligente de fluxo de caixa, alertas e tendências."
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
                  className="px-3 py-1.5 rounded-lg border border-momentum-border text-xs font-medium hover:bg-white transition-all"
                >
                  Fechar
                </button>
              )}
            </div>
          }
        />
      </div>

      {/* B) Corpo: Lista de mensagens */}
      <AsyncPanel
        isLoading={false} // Não há loading inicial de histórico agora
        isEmpty={messages.length === 0}
        emptyConfig={{
          title: "Sem mensagens",
          description: "Inicie uma conversa com seu advisor.",
          icon: Bot
        }}
        className="flex-1 overflow-hidden"
      >
        <div
          ref={containerRef}
          className="h-full overflow-y-auto px-6 py-4 space-y-6 scroll-smooth"
        >
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={cn(
                "flex w-full animate-in fade-in slide-in-from-bottom-2 duration-300",
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
                    ? "bg-gradient-to-br from-momentum-accent to-blue-500 text-white"
                    : "bg-white border border-momentum-border text-momentum-text"
                )}>
                  {m.role === "assistant" ? <Bot size={16} /> : <User size={16} />}
                </div>

                {/* Message Bubble */}
                <div className="flex flex-col gap-1.5">
                  <GlassPanel
                    className={cn(
                      "px-4 py-3 rounded-2xl text-[13px] leading-relaxed shadow-sm",
                      m.role === "assistant"
                        ? "bg-white/80 dark:bg-slate-900/40 rounded-tl-none border-momentum-accent/10"
                        : "bg-momentum-accent text-white rounded-tr-none border-none shadow-momentum-glow"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  </GlassPanel>

                  {m.timestamp && (
                    <span className={cn(
                      "text-[10px] opacity-50 font-medium",
                      m.role === "user" ? "text-right mr-1" : "ml-1"
                    )}>
                      {m.timestamp}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Typing state indicator */}
          {loading && (
            <div className="flex justify-start animate-pulse">
              <div className="flex gap-3 max-w-[80%]">
                <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
                <GlassPanel className="px-4 py-3 rounded-2xl rounded-tl-none bg-slate-100/50 dark:bg-slate-800/30 border-none">
                  <div className="flex gap-1 items-center h-4">
                    <span className="w-1 h-1 bg-momentum-muted rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1 h-1 bg-momentum-muted rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1 h-1 bg-momentum-muted rounded-full animate-bounce" />
                  </div>
                </GlassPanel>
              </div>
            </div>
          )}

          <div className="h-10" /> {/* Bottom spacing padding */}
        </div>
      </AsyncPanel>

      {/* C) Input area no rodapé */}
      <div className="px-6 py-4 border-t border-momentum-border/50 bg-white/30 backdrop-blur-md sticky bottom-0 z-10">
        <div className="max-w-4xl mx-auto space-y-3 pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleListening}
              disabled={!effectiveFeatures.voiceSTT || loading}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all",
                isListening
                  ? "bg-red-500 text-white shadow-lg animate-pulse"
                  : "bg-momentum-accent/10 text-momentum-accent hover:bg-momentum-accent/20"
              )}
              aria-label={isListening ? "Parar de ouvir" : "Falar com advisor"}
            >
              {isListening ? <MicOff size={14} /> : <Mic size={14} />}
              {isListening ? "Ouvindo..." : "Falar"}
            </button>

            {effectiveFeatures.voiceTTS && (
              <button
                onClick={speaking ? stopSpeaking : () => speak(messages[messages.length - 1]?.content)}
                className="p-1.5 rounded-full hover:bg-momentum-accent/10 text-momentum-muted transition-colors"
                title={speaking ? "Parar leitura" : "Ouvir última resposta"}
              >
                {speaking ? <VolumeX size={16} className="text-red-500" /> : <Volume2 size={16} />}
              </button>
            )}
          </div>

          <div className="relative flex items-end gap-2">
            <div className="flex-1">
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite sua dúvida financeira..."
                aria-label="Mensagem para o Advisor"
                className={cn(
                  "w-full bg-white dark:bg-slate-900/50 border border-momentum-border rounded-2xl px-4 py-3 pr-12 text-sm",
                  "focus:outline-none focus:ring-2 focus:ring-momentum-accent/40 focus:border-momentum-accent transition-all",
                  "resize-none min-h-[48px] max-h-32 scrollbar-none shadow-sm"
                )}
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className={cn(
                  "absolute right-2 bottom-2 h-9 w-9 rounded-xl flex items-center justify-center transition-all shadow-sm",
                  loading || !input.trim()
                    ? "bg-slate-100 text-slate-400 dark:bg-slate-800"
                    : "bg-momentum-accent text-white shadow-momentum-glow hover:scale-105 active:scale-95"
                )}
                aria-label="Enviar mensagem"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
          </div>

          <p className="text-[10px] text-momentum-muted text-center italic">
            Advisor Premium: Análise em tempo real de fluxos e categorias.
          </p>
        </div>
      </div>
    </div>
  );
}
