import OpenAI from "openai";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { logger } from "../utils/logger";

// Inicializa OpenAI (garanta que a chave esteja no .env ou config)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
  // Cria arquivo temporário preservando uma extensão compatível
  const ext = mimeType?.includes("mp4") ? "mp4" : "webm";
  const tempFilePath = path.join(os.tmpdir(), `audio_${Date.now()}.${ext}`);

  try {
    fs.writeFileSync(tempFilePath, audioBuffer);

    const response = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: "whisper-1",
      language: "pt",
      temperature: 0.2,
    });

    return response.text || "";
  } catch (error: any) {
    logger.error("❌ Erro no Whisper STT:", error);
    throw new Error("Não foi possível transcrever o áudio.");
  } finally {
    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
  }
}
