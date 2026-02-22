import authorizedFetch from "./authorizedFetch";

export type TTSRequest = {
  text: string; // pode ser SSML
  voice?: string; // ex.: "pt-BR-Neural-Advisor"
  profile?: "aconselhamento" | "tutorial";
};

export async function tts({ text, voice, profile }: TTSRequest): Promise<Blob> {
  const r = await authorizedFetch("/api/voice/tts", {
    method: "POST",
    body: { text, voice, profile } as any,
  });
  if (!r.ok) throw new Error(`/api/voice/tts -> ${r.status}`);
  return r.blob(); // ex.: audio/mpeg
}

export async function uploadAudio(audioBlob: Blob): Promise<{ text: string }> {
  const formData = new FormData();
  formData.append("file", audioBlob, "recording.webm");

  const r = await authorizedFetch("/api/ai/voice/stt", {
    method: "POST",
    body: formData,
  });

  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.message || `/api/ai/voice/stt -> ${r.status}`);
  }
  return r.json();
}
