import { db } from "src/services/firebase";
// ============================
// 🤖 dualClient.ts — AI Provider Bridge (v7.9)
// ============================

import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { OPENAI_KEY, GEMINI_KEY } from "../middleware/withSecrets";
import { trackUsage } from "../utils/usageTracker";
import { logger } from "../utils/logger";

type Provider = "openai" | "gemini";

let openai: OpenAI | null = null;
let gemini: GoogleGenerativeAI | null = null;

/**
 * Inicializa clientes apenas uma vez (lazy init).
 */
function ensureClients() {
  if (!openai) openai = new OpenAI({ apiKey: OPENAI_KEY.value() });
  if (!gemini) gemini = new GoogleGenerativeAI(GEMINI_KEY.value());
}

/**
 * Executa IA de forma adaptativa entre OpenAI e Gemini.
 */
export async function runDualAI(opts: {
  prompt: string;
  provider: Provider;
  tenantId: string;
}): Promise<{ text: string; tokens: number; provider: Provider }> {
  ensureClients();
  const { prompt, provider, tenantId } = opts;

  try {
    let text = "";
    let tokens = 0;

    if (provider === "openai") {
      const out = await openai!.chat.completions.create({
        model: "gpt-5",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
      });
      text = out.choices?.[0]?.message?.content ?? "";
      tokens = (out.usage?.total_tokens as number) ?? 0;
    } else {
      const model = gemini!.getGenerativeModel({ model: "gemini-2.5-pro" });
      const result = await model.generateContent(prompt);
      text = result.response.text();
      tokens = result.response.usageMetadata?.totalTokenCount ?? 0;
    }

    await trackUsage(tenantId, provider, tokens);
    logger.info("DualAI success", { provider, tokens });
    return { text, tokens, provider };
  } catch (e: any) {
    logger.error("DualAI error", { error: e?.message || e, provider });
    return {
      text: "Não foi possível gerar a análise no momento.",
      tokens: 0,
      provider,
    };
  }
}



