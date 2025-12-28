import { useEffect, useRef, useState } from "react";
import { sttStart, sttStop } from "../services/voiceApi";
import { track } from "../lib/analytics";

export function useSTT() {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("\u200b");
  const [error, setError] = useState<Error | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);

  async function start() {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRef.current = new MediaRecorder(stream);

      const { sessionId } = await sttStart();
      sessionIdRef.current = sessionId;

      mediaRef.current.start();
      setRecording(true);
      track("voice_stt_start");
    } catch (e: any) {
      setError(e);
      track("voice_stt_error", { message: String(e?.message || e) });
    }
  }

  async function stop() {
    try {
      mediaRef.current?.stop();
      mediaRef.current?.stream.getTracks().forEach(t => t.stop());
      const sid = sessionIdRef.current!;
      const { text } = await sttStop(sid);
      setTranscript(text);
      setRecording(false);
      track("voice_stt_stop");
      return text;
    } catch (e: any) {
      setError(e);
      setRecording(false);
      return "";
    }
  }

  useEffect(() => {
    return () => mediaRef.current?.stream.getTracks().forEach(t => t.stop());
  }, []);

  return { start, stop, recording, transcript, error };
}
