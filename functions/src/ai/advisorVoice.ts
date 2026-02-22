// ============================================================
// 🎧 Advisor Voice Route — Momentum AI (v9.5 Unified)
// ============================================================
// 🔹 Pipeline completo: áudio → texto → IA → fala (TTS)
// ============================================================

import { Request, Response } from "express";
import { runAdvisor } from "./advisor";
import { checkPlanLimit } from "../middleware/checkPlan";
import { db } from "src/services/firebase";
import { logger } from "../utils/logger";

// Lazy-load para evitar timeout
let speechClient: any, ttsClient: any;

async function getSpeechClient() {
  if (!speechClient) {
    const speech = await import("@google-cloud/speech");
    speechClient = new speech.SpeechClient();
  }
  return speechClient;
}

async function getTTSClient() {
  if (!ttsClient) {
    const tts = await import("@google-cloud/text-to-speech");
    ttsClient = new tts.TextToSpeechClient();
  }
  return ttsClient;
}

// ============================================================
// 🎙️ Processa entrada de voz e gera resposta falada
// ============================================================
export async function advisorVoice(req: Request, res: Response) {
  try {
    const uid = req.user?.uid;
    if (!uid) throw new Error("Usuário não autenticado.");

    await checkPlanLimit(uid, 200, "voiceAI");

    const audioBuffer =
      (req as any).file?.buffer ||
      (req as any).rawBody ||
      Buffer.from([]);

    if (!audioBuffer.length) throw new Error("Nenhum áudio recebido.");

    // 🎧 1️⃣ Transcreve o áudio (fala → texto)
    const speech = await getSpeechClient();
    const [result] = await speech.recognize({
      audio: { content: audioBuffer.toString("base64") },
      config: {
        encoding: "WEBM_OPUS",
        sampleRateHertz: 48000,
        languageCode: "pt-BR",
        enableAutomaticPunctuation: true,
      },
    });

    const transcript =
      result?.results?.map((r: any) => r.alternatives?.[0]?.transcript).join(" ") || "";
    if (!transcript) throw new Error("Falha ao transcrever o áudio.");

    logger.info("🎤 Transcrição obtida", { uid, transcript });

    // 🧠 2️⃣ Envia texto ao Advisor
    let capturedData: any = null;
    const mockReq = { ...req, body: { message: transcript } } as Request;
    const mockRes = {
      json: (d: any) => { capturedData = d; return mockRes; },
      status: (_code: number) => mockRes,
      set: () => mockRes,
      send: () => mockRes,
    } as unknown as Response;
    await runAdvisor(mockReq, mockRes);
    const replyText = capturedData?.reply?.answer || "Não consegui responder agora.";

    // 🔊 3️⃣ Converte resposta em áudio (texto → voz neural)
    const tts = await getTTSClient();
    const [speechResult] = await tts.synthesizeSpeech({
      input: { text: replyText },
      voice: { languageCode: "pt-BR", ssmlGender: "FEMALE" },
      audioConfig: { audioEncoding: "MP3", speakingRate: 1.05, pitch: 0.8 },
    });

    // 🪵 4️⃣ Log no Firestore
    await db.collection("ai_usage_logs").add({
      uid,
      feature: "voiceAI",
      transcript,
      response: replyText,
      timestamp: Date.now(),
    });

    logger.info("✅ advisorVoice finalizado", { uid });

    // 📦 5️⃣ Retorna áudio gerado
    res.set("Content-Type", "audio/mpeg");
    res.send(speechResult.audioContent);
  } catch (err: any) {
    logger.error("❌ advisorVoice error", { error: err.message });
    res.status(500).json({ ok: false, error: err.message });
  }
}

