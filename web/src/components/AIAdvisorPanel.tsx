import React, { useRef, useState } from "react";
import { useFeatures } from "@/context/FeatureGateContext";
import { resolveVoiceId } from "@/lib/voice";
import { useTTS } from "@/hooks/useTTS";
import { useAuthToken } from "../hooks/useAuthToken";
import api from "@/services/api";
import { useAuth } from "../context/AuthContext";
import { GlassPanel } from "./ui/GlassPanel";
import { Sparkles, Send, Bot, User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type AdvisorReply = { answer: string };
type AdvisorResponse = { ok: boolean; reply: AdvisorReply };

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
      text: "Olá! Sou seu consultor financeiro Momentum. Como posso ajudar com sua análise hoje?",
    },
  ]);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const { features, voiceProfiles } = useFeatures() as any;
  const token = useAuthToken();
  const { speak } = useTTS();

  const effectiveFeatures = features ?? {
    voiceTier: "none",
    voiceTTS: false,
    voiceSTT: false,
  };

  const effectiveVoiceProfiles = voiceProfiles ?? [];

  const resolvedAdvisorVoice = resolveVoiceId(
    effectiveFeatures.voiceTier,
    effectiveVoiceProfiles,
    "advisor",
  );

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center gap-4 text-momentum-muted italic">
        <Loader2 className="animate-spin" size={20} />
        <span className="text-xs font-bold uppercase tracking-widest">Conectando Advisor...</span>
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
      { role: "assistant", text: "Processando análise estratégica..." },
    ]);
    setPending(true);

    try {
      const data = await advisorSend(text);
      const answer = data.reply?.answer || "Sem resposta no momento. Tente reformular sua pergunta.";

      setMessages((m) => m.slice(0, -1).concat({ role: "assistant", text: answer }));

      if (effectiveFeatures.voiceTTS) {
        await speak({
          text: answer,
          voice: resolvedAdvisorVoice,
          profile: "aconselhamento",
        });
      }
    } catch (err) {
      console.error("Advisor Error:", err);
      setMessages((m) => m.slice(0, -1).concat({ role: "assistant", text: "Erro ao processar resposta. Tente novamente." }));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-transparent">
      <header className="p-6 border-b border-momentum-border/50">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 rounded-lg bg-momentum-accent/10 text-momentum-accent">
            <Sparkles size={16} />
          </div>
          <h3 className="text-sm font-bold text-momentum-text uppercase tracking-widest leading-none">AI Advisor</h3>
        </div>
        <p className="text-[10px] text-momentum-muted font-medium uppercase tracking-wider leading-relaxed">
          Inteligência Financeira Momentum em Tempo Real
        </p>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth scrollbar-none">
        {messages.map((m, i) => (
          <div key={i} className={cn("flex w-full animate-in fade-in slide-in-from-bottom-2 duration-300", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn("flex gap-3 max-w-[90%]", m.role === "user" ? "flex-row-reverse" : "flex-row")}>
              <div className={cn(
                "h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-1 shadow-sm",
                m.role === "assistant" ? "bg-momentum-accent text-white" : "bg-white border border-momentum-border text-momentum-text"
              )}>
                {m.role === "assistant" ? <Bot size={12} /> : <User size={12} />}
              </div>
              <div className={cn(
                "px-3 py-2.5 rounded-2xl text-[13px] leading-relaxed shadow-sm",
                m.role === "assistant"
                  ? "bg-slate-50 dark:bg-slate-900/50 text-momentum-text rounded-tl-none border border-momentum-border/30"
                  : "bg-momentum-accent text-white rounded-tr-none shadow-momentum-glow"
              )}>
                <div dangerouslySetInnerHTML={{ __html: m.text.replace(/\//g, "<br/>") }} />
              </div>
            </div>
          </div>
        ))}
        {pending && (
          <div className="flex justify-start animate-pulse">
            <div className="flex gap-2 items-center text-[10px] font-bold text-momentum-accent uppercase tracking-widest pl-10">
              <Loader2 className="animate-spin" size={12} />
              Analisando histórico...
            </div>
          </div>
        )}
      </div>

      <div className="p-6 border-t border-momentum-border/50 bg-white/30 backdrop-blur-sm">
        <div className="relative group">
          <textarea
            ref={inputRef}
            placeholder="Pergunte sobre tendências..."
            className="w-full bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-3 pr-12 text-sm text-momentum-text placeholder:text-momentum-muted focus:outline-none focus:ring-2 focus:ring-momentum-accent/20 focus:border-momentum-accent transition-all resize-none min-h-[48px] max-h-32 shadow-inner"
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
            className="absolute right-2 bottom-2 h-8 w-8 rounded-lg flex items-center justify-center bg-momentum-accent text-white shadow-momentum-glow hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
          >
            {pending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
        <p className="text-[9px] text-momentum-muted text-center mt-3 uppercase font-bold tracking-tighter opacity-60">
          Powered by Momentum Intelligence Layer
        </p>
      </div>
    </div>
  );
};
