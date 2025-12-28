import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { Send, Loader2, Bot, User } from "lucide-react";
import { useFeatures } from "../context/FeatureGateContext";
import { resolveVoiceId } from "@/lib/voice";
import { useTTS } from "@/hooks/useTTS";
import { useSTT } from "@/hooks/useSTT";
import { useAuthToken } from "../hooks/useAuthToken";
import api from "@/services/api";

type AdvisorMessage = {
  role: "user" | "assistant";
  content: string;
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

  const { start, stop, transcript, error: sttError } = useSTT({
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

    const history: AdvisorMessage[] = [
      ...messages,
      { role: "user", content: trimmed },
    ];

    setMessages(history);
    setInput("");
    setLoading(true);

    try {
      if (!token) {
        // Sem usuário autenticado → mensagem amigável
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content:
              "Você precisa estar autenticado para usar o Advisor. Faça login e tente novamente.",
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
      };

      setMessages((m) => [...m, reply]);

      if (effectiveFeatures.voiceTTS) {
        await speak(result.reply);
      }
    } catch (err: any) {
      if (err?.code === "NO_CREDITS") {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content:
              "Você ficou sem créditos de IA neste plano. Atualize seu plano ou aguarde a renovação dos créditos para continuar usando o Advisor.",
          },
        ]);
      } else {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: err?.message || "Erro ao processar resposta.",
          },
        ]);
      }
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

  return (
    <section className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
            <Bot className="h-4 w-4 text-emerald-700" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              CFO Advisor
            </h2>
            <p className="text-xs text-slate-500">
              Pergunte sobre caixa, runway e cenários
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-xs text-slate-500 hover:text-slate-700"
          >
            Fechar
          </button>
        )}
      </header>

      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-slate-50/60"
      >
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex gap-2 ${
              m.role === "assistant"
                ? "items-start"
                : "items-start justify-end"
            }`}
          >
            {m.role === "assistant" ? (
              <div className="h-7 w-7 rounded-full bg-emerald-100 flex items-center justify-center mt-0.5">
                <Bot className="h-4 w-4 text-emerald-700" />
              </div>
            ) : (
              <div className="h-7 w-7 rounded-full bg-slate-200 flex items-center justify-center mt-0.5">
                <User className="h-4 w-4 text-slate-700" />
              </div>
            )}

            <div
              className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs whitespace-pre-wrap ${
                m.role === "assistant"
                  ? "bg-white border border-slate-200 text-slate-800"
                  : "bg-emerald-600 text-white"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
      </div>

      <footer className="border-t border-slate-100 p-3 space-y-2 bg-white">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleToggleListening}
            disabled={!effectiveFeatures.voiceSTT}
            aria-pressed={isListening}
            aria-label={
              !effectiveFeatures.voiceSTT
                ? "Entrada de voz indisponível no seu plano"
                : isListening
                ? "Parar captura de voz"
                : "Iniciar captura de voz"
            }
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium shadow-sm transition ${
              sttStatus === "listening"
                ? "bg-red-500 text-white"
                : "bg-slate-100 text-slate-700"
            } ${
              !effectiveFeatures.voiceSTT ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {sttStatus === "listening" ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Ouvindo...
              </>
            ) : (
              <>
                <Bot className="h-3 w-3" />
                Falar em voz alta
              </>
            )}
          </button>

          {speaking && (
            <button
              type="button"
              onClick={stopSpeaking}
              className="text-[11px] text-slate-500 hover:text-slate-700"
            >
              Parar áudio
            </button>
          )}
        </div>

        {sttError && (
          <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
            {sttError}
          </p>
        )}

        <div className="flex items-end gap-2">
          <div className="flex-1 flex flex-col gap-1">
            <label className="sr-only" htmlFor="advisor-input">
              Mensagem para o CFO Advisor
            </label>
            <textarea
              id="advisor-input"
              className="flex-1 text-xs rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 resize-none min-h-[48px] max-h-[80px]"
              placeholder="Digite ou fale com seu CFO Virtual..."
              value={input}
              onChange={(ev) => setInput(ev.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={loading || !input.trim()}
            className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-emerald-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-700 transition"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>

        <p className="text-[10px] text-slate-400">
          O Advisor usa IA para analisar seus dados financeiros e sugerir ações.
        </p>
      </footer>
    </section>
  );
}





