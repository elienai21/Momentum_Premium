import { db } from "src/services/firebase";
// ============================
// 🎙️ Voice Commands Module — Momentum (v7.9.2)
// ============================

import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { logger } from "../utils/logger";

export const voiceRouter = Router();

type VoiceCommand = { text: string; audio?: Buffer };

async function executeVoiceCommand(cmd: VoiceCommand, userId: string, tenantId: string) {
  logger.info("Executing voice command", { cmd, userId, tenantId });
  return { ok: true, message: `Comando de voz recebido: ${cmd.text}` };
}

voiceRouter.post("/command", requireAuth, async (req, res, next) => {
  try {
    const command = req.body as VoiceCommand;
    const userId = req.user?.uid ?? "anonymous";
    const tenantId = req.tenant?.info?.id ?? "none";

    const result = await executeVoiceCommand(command, userId, tenantId);
    res.json(result);
  } catch (err) {
    logger.error("Voice command failed", { error: (err as Error).message });
    next(err);
  }
});



