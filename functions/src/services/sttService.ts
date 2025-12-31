// functions/src/services/sttService.ts
import OpenAI from "openai";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { logger } from "../utils/logger";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function transcribeAudio(
  audioBuffer: Buffer,
  originalMimeType: string | undefined,
  languageCode = "pt"
): Promise<{ text: string }> {
  if (!process.env.OPENAI_API_KEY) {
    const err = Object.assign(new Error("OPENAI_API_KEY não configurada"), {
      status: 503,
      code: "VOICE_DISABLED",
    });
    throw err;
  }

  const tempFilePath = path.join(os.tmpdir(), `upload_${Date.now()}.webm`);

  try {
    fs.writeFileSync(tempFilePath, audioBuffer);

    const response = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: "whisper-1",
      language: languageCode,
      temperature: 0.2,
      // Whisper aceita múltiplos formatos; mimetype aqui é apenas para logging
      // mas mantemos para rastrear auditoria se necessário.
    });

    return { text: response.text || "" };
  } catch (error: any) {
    logger.error("❌ Erro no STT (Whisper)", {
      error: error?.message,
      stack: error?.stack,
      mimeType: originalMimeType,
    });
    throw Object.assign(new Error("Falha ao processar áudio"), {
      status: 500,
      code: "STT_ERROR",
    });
  } finally {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
}
