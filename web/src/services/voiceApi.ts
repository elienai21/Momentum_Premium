import authorizedFetch from "./authorizedFetch";

export type TTSRequest = {
  text: string; // pode ser SSML
  voice?: string; // ex.: "pt-BR-Neural-Advisor"
  profile?: "aconselhamento" | "tutorial";
};

export async function tts({ text, voice, profile }: TTSRequest): Promise<Blob> {
  const r = await authorizedFetch("/api/voice/tts", {
    method: "POST",
    body: { text, voice, profile },
  });
  if (!r.ok) throw new Error(`/api/voice/tts -> ${r.status}`);
  return r.blob(); // ex.: audio/mpeg
}

export async function sttStart(): Promise<{ sessionId: string }> {
  const r = await authorizedFetch("/api/voice/stt/start", {
    method: "POST",
  });
  if (!r.ok) throw new Error(`/api/voice/stt/start -> ${r.status}`);
  return r.json();
}

export async function sttStop(sessionId: string): Promise<{ text: string }> {
  const r = await authorizedFetch(`/api/voice/stt/stop?sessionId=${encodeURIComponent(sessionId)}`, {
    method: "POST",
  });
  if (!r.ok) throw new Error(`/api/voice/stt/stop -> ${r.status}`);
  return r.json();
}
