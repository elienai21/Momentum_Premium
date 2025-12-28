// web/src/hooks/useRealtimeCfoSession.ts
import { useCallback, useState } from "react";
import api from "../services/api";

type RealtimeSessionInfo = {
  clientSecret: string;
  url: string;
  tenantId: string;
};

type UseRealtimeCfoSessionResult = {
  session: RealtimeSessionInfo | null;
  isConnected: boolean;
  loading: boolean;
  error: string | null;
  connect: () => Promise<void>;
  reset: () => void;
};

/**
 * Hook responsável por iniciar uma sessão de CFO Live (OpenAI Realtime)
 * via backend (/voice/realtime-session).
 *
 * Por enquanto ele só cria/gerencia a sessão — o áudio ainda é tratado
 * pelo VoicePanel "clássico". Depois a gente pluga WebSocket/áudio aqui.
 */
export function useRealtimeCfoSession(): UseRealtimeCfoSessionResult {
  const [session, setSession] = useState<RealtimeSessionInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const { data } = await api.post<{
        client_secret: string;
        url: string;
        tenantId: string;
      }>("/voice/realtime-session");

      setSession({
        clientSecret: data.client_secret,
        url: data.url,
        tenantId: data.tenantId,
      });
    } catch (err: any) {
      // Nosso interceptor do axios já normaliza em { status, message }
      const msg =
        err?.message ||
        "Não foi possível iniciar a sessão de voz do CFO. Tente novamente.";
      setError(msg);
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const reset = useCallback(() => {
    setSession(null);
    setError(null);
  }, []);

  return {
    session,
    isConnected: !!session,
    loading,
    error,
    connect,
    reset,
  };
}
