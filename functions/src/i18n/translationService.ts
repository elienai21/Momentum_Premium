import { db } from "src/services/firebase";
// ============================
// 🌐 Translation Service — Momentum AI (v7.9 Fix Final)
// ============================

import { logger } from "../utils/logger";
import { aiClient } from "../utils/aiClient";

/**
 * Translates a given text using Gemini or OpenAI.
 * @param text Source text
 * @param targetLang Target language (e.g. 'pt-BR', 'en-US')
 * @param traceId Optional trace ID
 */
export async function translateText(
  text: string,
  targetLang: string,
  traceId?: string
): Promise<string> {
  try {
    const prompt = `
Traduza o texto abaixo para ${targetLang}, mantendo o tom natural e contextual.
Responda apenas com o texto traduzido, sem explicações.

Texto:
"${text}"
`;

    const result = await aiClient(prompt, {
      tenantId: "system",
      userId: "system",
      model: "gemini",
      promptKind: "translation",
      locale: targetLang,
    });

    if (!result?.text) {
      logger.warn("Gemini translation returned empty response", {
        text,
        targetLang,
        traceId,
      });
      return text;
    }

    return result.text;
  } catch (error: any) {
    logger.error("Gemini translation failed, fallback to original", {
      text,
      targetLang,
      error: error.message,
      traceId,
    });
    return text;
  }
}



