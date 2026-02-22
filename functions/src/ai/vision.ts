import { db } from "src/services/firebase";
// ============================
// 👁️ Gemini Vision Parser — Momentum AI (v7.9.1 Clean Build)
// ============================

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { GEMINI_KEY } from "../middleware/withSecrets";
import { logger } from "../utils/logger";
import { ApiError } from "../utils/errors";

/**
 * Inicializa cliente do Gemini Vision
 */
function getGeminiClient(): GoogleGenerativeAI {
  const apiKey = GEMINI_KEY.value();
  if (!apiKey) {
    throw new ApiError(500, "GEMINI_KEY não configurada no Secret Manager.");
  }
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Analisa uma imagem de recibo e extrai dados financeiros
 */
export async function analyzeReceiptImage(
  imageBuffer: Buffer,
  meta?: { fileName?: string; uid?: string }
): Promise<{
  transaction?: {
    description: string;
    amount: number;
    date: string;
    category: string;
  };
  insights?: string[];
}> {
  if (!imageBuffer) {
    throw new ApiError(400, "Imagem não recebida para análise.");
  }

  try {
    const { retryWithBackoff } = await import("../utils/retryWithBackoff");

    return await retryWithBackoff(async () => {
      const gemini = getGeminiClient();
      const model = gemini.getGenerativeModel({
        model: "gemini-2.5-flash",
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
          },
        ],
      });

      const base64Data = imageBuffer.toString("base64");

      const prompt = `
Você é um assistente financeiro. Analise a imagem de um comprovante (nota fiscal ou recibo) e extraia:
- Nome do estabelecimento (description)
- Valor total da transação (amount)
- Data da transação (date, formato YYYY-MM-DD)
- Categoria da despesa (category)

Responda estritamente neste formato JSON:
{
  "transaction": {
    "description": "string",
    "amount": 123.45,
    "date": "YYYY-MM-DD",
    "category": "string"
  },
  "insights": ["string opcional 1", "string opcional 2"]
}
`;

      // Add timeout wrapper (30s default for vision processing)
      const timeoutMs = parseInt(process.env.VISION_TIMEOUT_MS || "30000", 10);
      let timeoutHandle: NodeJS.Timeout;

      const timeoutPromise = new Promise((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error("Vision API timeout")), timeoutMs);
      });

      const resultPromise = model.generateContent([
        { inlineData: { data: base64Data, mimeType: "image/jpeg" } },
        { text: prompt },
      ]).finally(() => clearTimeout(timeoutHandle));

      const result = await Promise.race([resultPromise, timeoutPromise]) as any;

      const text = result.response.text().trim();
      if (!text) throw new ApiError(500, "A IA não retornou dados do recibo.");

      const jsonText = text.replace(/```json|```/g, "").trim();
      let parsed: any;
      try {
        parsed = JSON.parse(jsonText);
      } catch {
        logger.warn("Vision API returned invalid JSON", { raw: jsonText.substring(0, 200) });
        throw new ApiError(422, "A IA retornou dados em formato inválido. Tente novamente.");
      }

      logger.info("Gemini Vision parsed receipt", {
        file: meta?.fileName,
        uid: meta?.uid,
        // Don't log full parsed data - may contain PII
        hasTransaction: !!parsed.transaction,
        hasInsights: !!parsed.insights,
      });

      return parsed;
    }, {
      maxRetries: 2,
      shouldRetry: (error) => {
        // Retry on timeout or rate limiting
        return error.message?.includes("timeout") ||
          error.message?.includes("429") ||
          error.status === 429 ||
          error.status === 503;
      },
    });
  } catch (error: any) {
    // Log only error type and basic info, not full stack or sensitive data
    logger.error("Erro ao processar imagem com Gemini Vision", {
      errorType: error.name,
      errorMessage: error.message?.substring(0, 100), // Limit message length
    });
    if (error.message?.includes("SAFETY")) {
      throw new ApiError(400, "Imagem bloqueada por segurança.");
    }
    if (error.message?.includes("timeout")) {
      throw new ApiError(504, "Timeout ao processar imagem. Tente novamente.");
    }
    throw new ApiError(503, "O serviço de visão do Gemini está indisponível.");
  }
}



