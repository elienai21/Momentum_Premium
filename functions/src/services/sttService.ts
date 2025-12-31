import OpenAI from "openai";
import * as fs from "fs/promises";
import { createReadStream, existsSync } from "fs";
import * as os from "os";
import * as path from "path";
import { logger } from "../utils/logger";

// Lazy-init do OpenAI para evitar quebras no deploy se a chave nĂŁo estiver no env
let openaiClient: OpenAI | null = null;
function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY nĂŁo encontrada no ambiente.");
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

export async function transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
  // Cria arquivo temporário preservando uma extensão compatível
  const ext = mimeType.includes("mp4") ? "mp4" : "webm";
  const tempFilePath = path.join(os.tmpdir(), `audio_${Date.now()}.${ext}`);

  try {
    await fs.writeFile(tempFilePath, audioBuffer);

    const openai = getOpenAIClient();
    const response = await openai.audio.transcriptions.create({
      file: createReadStream(tempFilePath),
      model: "whisper-1",
      language: "pt",
      temperature: 0.2,
    });

    return response.text || "";
  } catch (error: any) {
    logger.error("❌ Erro no Whisper STT:", error);
    throw new Error("Não foi possível transcrever o áudio.");
  } finally {
    try {
      if (existsSync(tempFilePath)) {
        await fs.unlink(tempFilePath);
      }
    } catch (unlinkError: any) {
      logger.warn("⚠️ Falha ao remover arquivo temporário de áudio:", { error: unlinkError });
    }
  }
}
