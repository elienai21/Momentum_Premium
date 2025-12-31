// ============================================================
// 🧠 Momentum Voice AI Service — Speech-to-Text + Gemini v9.5
// ============================================================

import { Request, Response } from "express";
import multer from "multer";
import { checkPlanLimit } from "../middleware/checkPlan";
import { logger } from "../utils/logger";
import { db } from "src/services/firebase";
import { aiClient } from "../utils/aiClient";
import { transcribeAudio } from "./sttService";

// Upload handler (áudio em memória)
export const upload = multer({ storage: multer.memoryStorage() });

// ============================================================
// 🎤  Fala → Texto com pontuação natural (Gemini refinement)
// ============================================================
export async function voiceHandler(req: Request, res: Response) {
  try {
    const uid = (req as any).user?.uid;
    if (!uid) throw new Error("Usuário não autenticado.");

    const file = (req as any).file as { buffer?: Buffer; mimetype?: string } | undefined;
    if (!file?.buffer) throw new Error("Nenhum áudio enviado.");

    // 💳 Controle de cota
    await checkPlanLimit(uid, 150, "voiceAI");

    const sttResult = await transcribeAudio(
      file.buffer as Buffer,
      file.mimetype,
      "pt"
    );

    const rawText = sttResult.text?.trim() || "";
    if (!rawText) throw new Error("Falha na transcrição do áudio.");

    // ✨ Reescreve a fala com pontuação natural via Gemini
    const refinement = await aiClient(
      `Reescreva naturalmente esta frase com pontuação correta e entonação humana: "${rawText}"`,
      {
        tenantId: "voice",
        userId: uid,
        model: "gemini",
        promptKind: "speech-refine",
        locale: "pt-BR",
      }
    );

    const finalText = refinement.text?.trim() || rawText;

    // 📊 Log Firestore
    await db.collection("ai_voice_logs").add({
      uid,
      transcript: rawText,
      refined: finalText,
      timestamp: Date.now(),
    });

    logger.info("🎧 Transcrição de voz concluída", { uid });

    res.json({ ok: true, text: finalText });
  } catch (err: any) {
    logger.error("❌ Erro no voiceHandler", { error: err.message });
    res.status(500).json({
      ok: false,
      error: err.message || "Erro interno no processamento de voz.",
    });
  }
}
