import { useEffect, useRef, useState } from "react";
import { uploadAudio } from "../services/voiceApi";
import { track } from "../lib/analytics";

export function useSTT() {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("\u200b");
  const [error, setError] = useState<Error | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function start() {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRef.current.start();
      setRecording(true);
      track("voice_stt_start");
    } catch (e: any) {
      setError(e);
      track("voice_stt_error", { message: String(e?.message || e) });
    }
  }

  async function stop() {
    return new Promise<string>((resolve) => {
      if (!mediaRef.current) return resolve("");

      mediaRef.current.onstop = async () => {
        try {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          const { text } = await uploadAudio(blob);
          setTranscript(text);
          track("voice_stt_success");
          resolve(text);
        } catch (e: any) {
          setError(e);
          track("voice_stt_error", { message: String(e?.message || e) });
          resolve("");
        } finally {
          setRecording(false);
          // Cleanup tracks
          mediaRef.current?.stream.getTracks().forEach((t) => t.stop());
        }
      };

      mediaRef.current.stop();
    });
  }

  useEffect(() => {
    return () => mediaRef.current?.stream.getTracks().forEach(t => t.stop());
  }, []);

  return { start, stop, recording, transcript, error };
}
