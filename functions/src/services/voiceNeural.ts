// ============================================================
// 🎙️ Voice Neural Service — Momentum TTS AI (v8.4 Premium)
// ============================================================

import { Request, Response } from "express";
import { checkPlanLimit } from "../middleware/checkPlan";
import textToSpeech from "@google-cloud/text-to-speech";
import { logger } from "../utils/logger";
import { db } from "src/services/firebase";

// Lazy init do cliente de TTS (Text-to-Speech)
let ttsClient: any | null = null;

async function getTtsClient() {
  if (!ttsClient) {
    ttsClient = new textToSpeech.TextToSpeechClient();
  }
  return ttsClient;
}

// ============================================================
// 🔊 IA de Voz — TTS Neural Momentum
// ============================================================
export async function voiceNeural(req: Request, res: Response) {
  const uid = (req as any).user?.uid; // ajuste conforme seu middleware de auth
  const { text, voice = "female" } = req.body;

  if (!uid)
    return res
      .status(401)
      .json({ ok: false, error: "Usuário não autenticado." });
  if (!text || !text.trim())
    return res
      .status(400)
      .json({ ok: false, error: "Texto ausente para conversão." });

  try {
    // ✅ 1. Controle de plano (cota e feature)
    await checkPlanLimit(uid, 100, "ttsNeural");

    // ✅ 2. Geração de áudio
    const client = await getTtsClient();
    const [response] = await client.synthesizeSpeech({
      input: { text },
      voice: {
        languageCode: "pt-BR",
        name: voice === "male" ? "pt-BR-Neural2-D" : "pt-BR-Neural2-A",
      },
      audioConfig: {
        audioEncoding: "MP3",
        speakingRate: 1.05,
        pitch: 0.9,
        volumeGainDb: 0.2,
      },
    });

    if (!response.audioContent) {
      throw new Error("Falha ao gerar áudio de voz neural");
    }

    // ✅ 3. Registro no Firestore (monitoramento de uso)
    await db.collection("ai_usage_logs").add({
      uid,
      feature: "ttsNeural",
      textLength: text.length,
      timestamp: Date.now(),
    });

    logger.info("🟣 Voz neural gerada com sucesso", {
      uid,
      length: text.length,
    });
    res.set("Content-Type", "audio/mpeg").send(response.audioContent);
  } catch (error: any) {
    logger.error("❌ Erro no voiceNeural", { uid, error: error.message });
    res.status(500).json({ ok: false, error: error.message });
  }
}

