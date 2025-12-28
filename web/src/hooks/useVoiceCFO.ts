// web/src/hooks/useVoiceCFO.ts
import { useCallback, useEffect, useRef, useState } from "react";
import {
  createRealtimeCfoSession,
  RealtimeSessionResponse,
} from "../services/VoiceRealtimeApi";
import { useToast } from "../components/Toast";

type VoiceStatus = "idle" | "connecting" | "ready" | "closed" | "error";

interface VoiceMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Hook para gerenciar a sessão de CFO Live (OpenAI Realtime).
 * Pensado para uso intenso em mobile: respostas curtas e estado simples.
 */
export function useVoiceCFO() {
  const { notify } = useToast();

  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [session, setSession] = useState<RealtimeSessionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);

  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [currentAssistantText, setCurrentAssistantText] = useState<string>("");
  const [lastAssistantMessage, setLastAssistantMessage] = useState<string | null>(
    null,
  );

  // 🔌 Abre a sessão Realtime (chama backend + conecta WS)
  const connect = useCallback(async () => {
    if (status === "connecting" || status === "ready") return;

    setStatus("connecting");
    setError(null);
    setCurrentAssistantText("");
    setLastAssistantMessage(null);

    try {
      const s = await createRealtimeCfoSession();
      setSession(s);

      // URL para o WebSocket Realtime
      // Forma genérica usando clientSecret como token de acesso.
      // Se a OpenAI pedir outro formato, basta ajustar aqui.
      const wsUrl = `${s.wsUrl}?model=${encodeURIComponent(
        s.model,
      )}&client_secret=${encodeURIComponent(s.clientSecret)}`;

      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setStatus("ready");
      };

      ws.onerror = () => {
        setStatus("error");
        const msg = "Falha na conexão de voz com o CFO.";
        setError(msg);
        notify({
          type: "error",
          message: msg,
        });
      };

      ws.onclose = () => {
        setStatus("closed");
      };

      ws.onmessage = (event) => {
        // A API Realtime manda vários tipos de eventos.
        // Aqui tratamos o caso de texto final "response.completed".
        try {
          const data = JSON.parse(event.data);

          // Exemplo simplificado de parsing do evento.
          // Em produção dá pra tratar também os deltas para streaming.
          if (data.type === "response.completed") {
            const text =
              data.response?.output?.[0]?.content?.[0]?.text ??
              data.output?.[0]?.content?.[0]?.text ??
              "";

            if (typeof text === "string" && text.trim()) {
              setCurrentAssistantText("");
              setLastAssistantMessage(text);
              setMessages((prev) => [
                ...prev,
                { role: "assistant", content: text },
              ]);
            }
          }

          // Alguns modelos usam eventos "response.output_text.delta" / "done".
          if (data.type === "response.output_text.delta") {
            const delta = data.delta ?? data.text ?? "";
            if (typeof delta === "string" && delta) {
              setCurrentAssistantText((prev) => prev + delta);
            }
          }

          if (data.type === "response.output_text.done") {
            if (currentAssistantText.trim()) {
              setLastAssistantMessage(currentAssistantText);
              setMessages((prev) => [
                ...prev,
                { role: "assistant", content: currentAssistantText },
              ]);
              setCurrentAssistantText("");
            }
          }
        } catch {
          // Pode ser frame binário de áudio ou mensagem não-JSON → ignoramos.
        }
      };
    } catch (err: any) {
      setStatus("error");
      const msg =
        err?.message || "Não foi possível iniciar o CFO Live. Tente novamente.";
      setError(msg);
      notify({
        type: "error",
        message: msg,
      });
    }
  }, [status, notify, currentAssistantText]);

  // ❌ Fecha a sessão (WS)
  const disconnect = useCallback(() => {
    const ws = socketRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
    socketRef.current = null;
    setStatus("closed");
  }, []);

  // ✉️ Envia texto (modo “chat” Realtime)
  // Isso já é útil mesmo sem voz, e serve como fallback em mobile.
  const sendText = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      const ws = socketRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        notify({
          type: "error",
          message: "Conexão de voz ainda não está pronta.",
        });
        return;
      }

      // Guarda no histórico local
      setMessages((prev) => [...prev, { role: "user", content: text }]);

      // Evento para o Realtime processar um texto de entrada
      const eventId = `user_${Date.now()}`;

      ws.send(
        JSON.stringify({
          type: "input_text",
          event_id: eventId,
          text,
        }),
      );

      // Pede a criação de uma nova resposta
      ws.send(
        JSON.stringify({
          type: "response.create",
        }),
      );
    },
    [notify],
  );

  // Cleanup automático ao desmontar o hook
  useEffect(() => {
    return () => {
      try {
        const ws = socketRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      } catch {
        // ignore
      }
    };
  }, []);

  return {
    status,
    session,
    error,
    messages,
    currentAssistantText,
    lastAssistantMessage,
    connect,
    disconnect,
    sendText,
  };
}
