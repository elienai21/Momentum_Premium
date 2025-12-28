import { db } from "src/services/firebase";
// ============================
// 🗣️ Voice Controller — Momentum Voice AI (v7.9 Fix Final)
// ============================

import { Router, Request, Response, NextFunction } from "express";
import { requireAuth } from "../middleware/requireAuth";
import Busboy from "busboy";
import { logger } from "../utils/logger";

// ⚠️ Placeholder seguro até o módulo ai/voice ser implementado
async function handleVoiceCommand(
  payload: { uid: string; text?: string; audio?: Buffer; filename?: string },
  _req: Request
) {
  if (payload.text) {
    return {
      message: `Comando de voz recebido: "${payload.text}"`,
      actions: [{ name: "echo", args: { text: payload.text } }],
    };
  }

  if (payload.audio) {
    return {
      message: `Áudio recebido (${payload.filename}), processamento simulado.`,
      transcript: "Simulação de transcrição (stub).",
    };
  }

  return { message: "Nenhum dado válido recebido." };
}

export const voiceController = Router();

/**
 * Aceita:
 *  - JSON: { text }
 *  - multipart/form-data: "audio" (audio/webm)
 */
voiceController.post(
  "/voice/command",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.is("application/json")) {
        const { text } = req.body || {};
        if (!text) return res.status(400).json({ ok: false, error: "Missing text" });
        const out = await handleVoiceCommand({ uid: req.user!.uid, text }, req);
        return res.json({ ok: true, ...out });
      }

      if (req.is("multipart/form-data")) {
        const bb = Busboy({ headers: req.headers } as any);
        let audioBuffer: Buffer | null = null;
        let filename = "voice.webm";

        await new Promise<void>((resolve, reject) => {
          bb.on("file", (_name, file, info) => {
            filename = info.filename || filename;
            const chunks: Buffer[] = [];
            file.on("data", (d: Buffer) => chunks.push(d));
            file.on("end", () => {
              audioBuffer = Buffer.concat(chunks);
            });
          });
          bb.on("error", reject);
          bb.on("finish", resolve);
          req.pipe(bb);
        });

        if (!audioBuffer)
          return res.status(400).json({ ok: false, error: "Missing audio" });

        const out = await handleVoiceCommand({ uid: req.user!.uid, audio: audioBuffer, filename }, req);
        return res.json({ ok: true, ...out });
      }

      return res.status(415).json({ ok: false, error: "Unsupported content type" });
    } catch (err: any) {
      logger.error("Voice command failed", { error: err.message });
      next(err);
    }
  }
);



