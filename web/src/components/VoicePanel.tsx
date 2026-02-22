// web/src/components/VoicePanel.tsx
// Nota: painel de voz só aparece em ambiente DEV
import { useEffect, useState } from "react";
import { Mic, MicOff, Play, Loader2, Lock } from "lucide-react";
import { useFeatures } from "@/context/FeatureGateContext";
import { resolveVoiceId } from "@/lib/voice";
import { useTTS } from "@/hooks/useTTS";
import { useSTT } from "@/hooks/useSTT";
import { useAuthToken } from "../hooks/useAuthToken";
import authorizedFetch from "@/services/authorizedFetch";

type VoiceMessage = {
  role: "user" | "assistant";
  content: string;
};

type VoicePanelProps = {
  tenantId?: string;
  plan?: string | null;
};

async function voiceAgentQuery(messages: VoiceMessage[]) {
  const r = await authorizedFetch("/api/voice/session", {
    method: "POST",
    body: { messages } as any,
  });

  if (!r.ok) {
    let detail: any = null;
    try {
      detail = await r.json();
    } catch {
      // ignore
    }
    const err: any = new Error(
      detail?.message || `/api/voice/session -> ${r.status}`,
    );
    if (detail?.code) err.code = detail.code;
    throw err;
  }

  return (await r.json()) as { reply: string; actions?: string[] };
}

export default function VoicePanel({ tenantId: _tenantId, plan: _plan }: VoicePanelProps) {
  const isDev = import.meta.env.DEV;
  if (!isDev) return null;

  const token = useAuthToken();
  const { features, voiceProfiles } = useFeatures();

  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [reply, setReply] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [noCredits, setNoCredits] = useState(false);
  const [sending, setSending] = useState(false);

  const { speak } = useTTS();
  const { start, stop, recording, transcript, error: sttError } = useSTT();

  const voiceId = resolveVoiceId(features.voiceTier, voiceProfiles, "advisor");

  useEffect(() => {
    if (!token) return;
    setMessages([
      {
        role: "assistant",
        content: "Oi! Sou o assistente de voz. O que precisa hoje?",
      },
    ]);
  }, [token]);

  const handlePlay = async () => {
    const textToSubmit = transcript?.trim();
    if (sending || !textToSubmit) return;

    setSending(true);
    setApiError(null);
    setNoCredits(false);

    const history: VoiceMessage[] = [
      ...messages,
      { role: "user", content: textToSubmit },
    ];
    setMessages(history);

    try {
      const result = await voiceAgentQuery(history);

      setReply(result.reply);
      setMessages(prev => [...prev, { role: "assistant", content: result.reply }]);

      if (features.voiceTTS) {
        setIsSpeaking(true);
        await speak({
          text: result.reply,
          voice: voiceId,
          profile: "aconselhamento"
        });
        setIsSpeaking(false);
      }
    } catch (err: any) {
      if (err?.code === "NO_CREDITS") {
        setNoCredits(true);
        setApiError(
          "Seus créditos de voz acabaram neste plano. Atualize seu plano ou aguarde a renovação dos créditos.",
        );
      } else {
        setApiError(err?.message || "Falha na chamada de voz");
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mic className="h-5 w-5" />
          <div className="text-sm font-semibold">Voice (DEV)</div>
        </div>
        {!token && (
          <div className="flex items-center gap-1 text-xs text-amber-300">
            <Lock className="h-4 w-4" /> Requer login
          </div>
        )}
      </div>

      <div className="mt-3 space-y-2 text-sm">
        <div className="rounded-lg bg-black/30 p-3 min-h-[80px]">
          {transcript && transcript !== "\u200b" ? transcript : "Fale algo..."}
        </div>
        {reply && (
          <div className="rounded-lg bg-emerald-900/40 p-3">
            <div className="text-xs uppercase text-emerald-200">Resposta</div>
            <div>{reply}</div>
          </div>
        )}
        {apiError && (
          <div className="rounded-lg bg-amber-900/40 p-3 text-amber-200">
            {apiError}
          </div>
        )}
        {sttError && (
          <div className="rounded-lg bg-rose-900/40 p-3 text-rose-200">
            {sttError.message}
          </div>
        )}
        {noCredits && (
          <div className="rounded-lg bg-amber-800/40 p-2 text-xs text-amber-100">
            Créditos de voz esgotados neste plano.
          </div>
        )}
        {isSpeaking && (
          <div className="flex items-center gap-2 text-xs text-emerald-400 animate-pulse">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Falando...
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-3">
        {recording ? (
          <button
            onClick={() => stop()}
            className="flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold hover:bg-rose-700 transition"
          >
            <MicOff className="h-4 w-4" /> Parar
          </button>
        ) : (
          <button
            onClick={() => start()}
            disabled={sending}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            <Mic className="h-4 w-4" /> Gravar
          </button>
        )}

        <button
          onClick={handlePlay}
          disabled={sending || !transcript || transcript === "\u200b" || recording}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          Enviar
        </button>
      </div>
    </div>
  );
}
