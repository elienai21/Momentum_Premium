// web/src/services/VoiceRealtimeApi.ts
import api from "./api";

export type RealtimeSessionStatus = "ok";

export interface RealtimeSessionResponse {
  status: RealtimeSessionStatus;
  provider: "openai";
  wsUrl: string;
  model: string;
  clientSecret: string;
  expiresAt?: number;
  tenantId: string;
}

/**
 * Cria uma sessão de CFO Live (OpenAI Realtime) no backend
 * e retorna os dados necessários para abrir o WebSocket no front.
 *
 * Endpoint backend: POST /api/voice/realtime-session
 * (ajustado pelo api.baseURL = /api)
 */
export async function createRealtimeCfoSession(): Promise<RealtimeSessionResponse> {
  // ⚠️ Se no backend o router estiver montado em "/voice" em vez de "/api/voice",
  // basta trocar a string para "/voice/realtime-session".
  const { data } = await api.post<RealtimeSessionResponse>(
    "/voice/realtime-session",
    {},
  );
  return data;
}

