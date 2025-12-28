// web/src/components/VoicePanelRealtime.tsx
import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import api from "../services/api";
import { useAuthToken } from "../hooks/useAuthToken";
import { useFeatures } from "@/context/FeatureGateContext";

type RealtimeSessionResponse = {
  client_secret: string;
  url: string;
  tenantId: string;
};

type VoicePanelRealtimeProps = {
  tenantId?: string;
  plan?: string | null;
};

type ConnectionStatus = "idle" | "connecting" | "connected" | "error";

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export default function VoicePanelRealtime({
  tenantId,
  plan,
}: VoicePanelRealtimeProps) {
  const token = useAuthToken();
  const { features } = useFeatures() as any;

  const normalizedPlan = (plan || "").toLowerCase();
  const planHasVoice = normalizedPlan === "cfo" || normalizedPlan === "pro";

  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [recording, setRecording] = useState(false);
  const [lastMessage, setLastMessage] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // ===== Áudio resposta da IA =====
  async function playAudioFromBase64(b64: string) {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    const audioCtx = audioContextRef.current;
    const arrayBuffer = base64ToArrayBuffer(b64);

    try {
      const decoded = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
      const source = audioCtx.createBufferSource();
      source.buffer = decoded;
      source.connect(audioCtx.destination);
      source.start();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Erro ao decodificar áudio do CFO:", err);
    }
  }

  async function initAudioCapture() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const recorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });
      mediaRecorderRef.current = recorder;

      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const buffer = await blob.arrayBuffer();
        const b64 = btoa(
          String.fromCharCode(...new Uint8Array(buffer)),
        );

        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) return;

        // Envia áudio para o buffer de entrada
        ws.send(
          JSON.stringify({
            type: "input_audio_buffer.append",
            audio: b64,
          }),
        );

        ws.send(
          JSON.stringify({
            type: "input_audio_buffer.commit",
          }),
        );

        ws.send(
          JSON.stringify({
            type: "response.create",
            response: {
              instructions:
                "Responda como CFO do Momentum, em português, de forma curta e prática.",
            },
          }),
        );
      };

      // grava em rajadas (ex.: 2s)
      recorder.start(2000);
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("Erro ao capturar áudio:", err);
      setError(
        "Não foi possível acessar o microfone. Verifique as permissões do navegador.",
      );
    }
  }

  function stopAudioCapture() {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;

    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
  }

  async function startSession() {
    try {
      setError(null);
      setStatus("connecting");
      setLastMessage("");

      // 1) Pede sessão efêmera pro backend
      const { data } = await api.post<RealtimeSessionResponse>(
        "/voice/realtime-session",
      );

      const { client_secret, url } = data;
      const wsUrl = `${url}?client_secret=${encodeURIComponent(
        client_secret,
      )}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus("connected");
        setLastMessage(
          "Conectado ao Momentum Live CFO. Quando terminar de falar, vou responder em voz e texto.",
        );
      };

      ws.onerror = (event) => {
        // eslint-disable-next-line no-console
        console.error("WebSocket error", event);
        setStatus("error");
        setError("Erro ao conectar com o CFO em tempo real.");
      };

      ws.onclose = () => {
        setStatus("idle");
        stopAudioCapture();
        setRecording(false);
        setLastMessage((prev) => prev || "Sessão encerrada.");
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data as string);

          if (data.type === "response.text.delta") {
            const chunk = data.delta ?? "";
            setLastMessage((prev) => prev + chunk);
          }

          if (data.type === "response.audio.delta" && data.audio) {
            await playAudioFromBase64(data.audio);
          }
        } catch {
          // frame não-JSON → ignora no MVP
        }
      };
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("Erro ao iniciar sessão Realtime:", err);
      setStatus("error");
      setError(
        err?.response?.data?.error ||
          "Não foi possível iniciar o Momentum Live CFO.",
      );
    }
  }

  function disconnect() {
    wsRef.current?.close();
    wsRef.current = null;
    stopAudioCapture();
    setRecording(false);
    setStatus("idle");
  }

  const handleToggleRecording = async () => {
    if (status === "idle") {
      // conecta e inicia captura na primeira vez
      await startSession();
      await initAudioCapture();
      setRecording(true);
      return;
    }

    if (status === "connected") {
      if (!recording) {
        // já conectado, mas não gravando → começa
        await initAudioCapture();
        setRecording(true);
      } else {
        // gravando → parar (isso dispara o onstop do MediaRecorder, que envia o áudio)
        stopAudioCapture();
        setRecording(false);
      }
    }
  };

  useEffect(() => {
    return () => {
      // cleanup ao desmontar
      disconnect();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isConnected = status === "connected";
  const isConnecting = status === "connecting";

  if (!token) {
    return null;
  }

  if (!planHasVoice) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-xs text-slate-600">
        <p className="mb-1 font-medium text-slate-800">
          Voz do CFO não incluída neste plano
        </p>
        <p>
          Para falar com o CFO em tempo real, faça upgrade para um plano com o
          módulo de voz ativado.
        </p>
      </section>
    );
  }

  // (Se tiver feature flags específicas para voz em tempo real, dá pra testar aqui usando `features`)

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 flex flex-col gap-3">
      <header className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Momentum Live CFO{" "}
            <span className="ml-1 text-[10px] text-slate-400">Realtime</span>
          </h3>
          <p className="text-xs text-slate-500">
            Fale com o CFO em tempo quase real. Aperte o botão, explique sua
            situação e espere a resposta.
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full border ${
            isConnected
              ? "border-emerald-400/40 text-emerald-300"
              : status === "error"
              ? "border-rose-400/40 text-rose-300"
              : "border-slate-200 text-slate-500"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected
                ? "bg-emerald-400 animate-pulse"
                : status === "error"
                ? "bg-rose-400"
                : "bg-slate-400"
            }`}
          />
          {isConnected
            ? "Conectado"
            : isConnecting
            ? "Conectando..."
            : status === "error"
            ? "Erro"
            : "Offline"}
        </span>
      </header>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleToggleRecording}
          disabled={isConnecting}
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium shadow-sm transition ${
            recording
              ? "bg-red-500 text-white"
              : "bg-gradient-to-r from-brand-1 to-brand-2 text-white"
          } ${isConnecting ? "opacity-60 cursor-wait" : ""}`}
        >
          {isConnecting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Conectando...
            </>
          ) : recording ? (
            <>
              <MicOff className="h-4 w-4" />
              Parar de falar
            </>
          ) : (
            <>
              <Mic className="h-4 w-4" />
              Falar com o CFO
            </>
          )}
        </button>

        <div className="text-[11px] text-slate-500" aria-live="polite">
          {recording && status === "connected" && "Microfone ativo..."}
          {!recording && isConnected && "Sessão ativa. Clique para falar."}
          {!isConnected && !isConnecting && "Clique para iniciar o Live CFO."}
        </div>
      </div>

      {error && (
        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
          {error}
        </p>
      )}

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800 min-h-[80px]">
        <p className="font-medium mb-1">Resposta do CFO:</p>
        {lastMessage ? (
          <p className="whitespace-pre-wrap">{lastMessage}</p>
        ) : (
          <p className="text-slate-500">
            Assim que você falar e eu processar o áudio, a resposta aparece
            aqui e também em áudio.
          </p>
        )}
      </div>
    </section>
  );
}
