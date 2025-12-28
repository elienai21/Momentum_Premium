import { useRef, useState } from "react";
import { tts, type TTSRequest } from "../services/voiceApi";
import { track } from "../lib/analytics";

export function useTTS() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  async function speak(req: TTSRequest) {
    try {
      setLoading(true); setError(null);
      const blob = await tts(req);
      const url = URL.createObjectURL(blob);
      if (!audioRef.current) audioRef.current = new Audio();
      audioRef.current.src = url;
      await audioRef.current.play();
      track("voice_tts_play", { profile: req.profile });
    } catch (e: any) {
      setError(e);
      track("voice_tts_error", { message: String(e?.message || e) });
    } finally {
      setLoading(false);
    }
  }

  function stop() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      track("voice_tts_stop");
    }
  }

  return { speak, stop, loading, error };
}
