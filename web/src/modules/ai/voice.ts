// ============================================================
// ÐYZT Momentum Voice AI ƒ?" Full Duplex Voice Engine (v9.5 Final)
// ============================================================
// ÐYõÿ Converte fala ƒÅ' texto (Speech-to-Text) e texto ƒÅ' fala (TTS Neural)
// ÐY"? Autenticação Firebase + IA Momentum Voice Endpoints
// ============================================================

import { getAuth } from "firebase/auth";
import "../../services/firebase";
import { API_URL } from "@/config/api";
import authorizedFetch from "@/services/authorizedFetch";

type VoiceResponseCallback = (responseText: string) => void;

// ============================================================
// ÐYZõ FALA ƒÅ' TEXTO (Speech-to-Text via Cloud Run / API)
// ============================================================
export async function recordAndSendToAI(onResponse: VoiceResponseCallback) {
  try {
    // ÐYZÏ Solicita permissão para microfone
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
    const chunks: BlobPart[] = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      console.log("ÐY>' Gravação finalizada. Processando áudio...");
      const audioBlob = new Blob(chunks, { type: "audio/webm" });

      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        console.warn("ƒsÿ‹÷? Usuário não autenticado.");
        onResponse("Usuário não autenticado.");
        return;
      }

      // ÐYO? Endpoint principal de voz
      const baseUrl = `${API_URL}/voice`;

      const formData = new FormData();
      formData.append("audio", audioBlob, "input.webm");

      try {
        const res = await authorizedFetch(baseUrl, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          console.error("ƒ?O Erro HTTP:", res.status);
          onResponse("Erro ao processar áudio.");
          return;
        }

        const data = await res.json();
        console.log("ƒo. Retorno do backend:", data);

        if (data?.ok && data.text) {
          onResponse(data.text);
          // ÐY-œ‹÷? Fala a interpretação textual da IA
          playAIResponse(data.text);
        } else if (data?.ok && data.reply) {
          onResponse(data.reply);
          playAIResponse(data.reply);
        } else {
          onResponse("Não consegui entender o áudio. Pode repetir?");
        }
      } catch (err) {
        console.error("ÐYsù Falha ao enviar áudio:", err);
        onResponse("Falha na comunicação com o servidor de voz.");
      } finally {
        stream.getTracks().forEach((t) => t.stop());
      }
    };

    // ƒ-ô‹÷? Inicia e encerra automaticamente
    mediaRecorder.start();
    console.log("ÐYZT Gravação iniciada...");
    setTimeout(() => {
      if (mediaRecorder.state === "recording") {
        console.log("ƒ?û Encerrando gravação automática...");
        mediaRecorder.stop();
      }
    }, 6000);
  } catch (err: any) {
    console.error("ƒ?O Erro ao acessar microfone:", err);
    onResponse("Não foi possível acessar o microfone. Verifique as permissões.");
  }
}

// ============================================================
// ÐY"S TEXTO ƒÅ' FALA (TTS Neural via API VoiceNeural)
// ============================================================
export async function playAIResponse(text: string) {
  try {
    if (!text || text.trim().length < 2) return;

    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      console.warn("ƒsÿ‹÷? Usuário não autenticado para TTS.");
      return;
    }

    const ttsUrl = `${API_URL}/voice/tts`;

    const res = await authorizedFetch(ttsUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) throw new Error(`Erro HTTP ${res.status}`);

    const audioBlob = await res.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audio.volume = 1.0;
    audio.play().catch((err) => console.error("Erro ao reproduzir áudio:", err));

    console.log("ÐY\"S Reprodução de resposta iniciada.");
  } catch (err) {
    console.error("ƒ?O Falha no TTS:", err);
  }
}
