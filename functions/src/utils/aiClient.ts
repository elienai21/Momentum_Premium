// functions/src/utils/aiClient.ts
import { logger } from "./logger";
import { trackUsage } from "./usageTracker";

declare const fetch: any; // garante compatibilidade de tipos em ambientes sem lib DOM

export type Meta = {
  tenantId: string;
  userId?: string;
  model: "gemini" | "openai"; // preferência do chamador (usada como fallback)
  promptKind: string;
  locale?: string;
};

export type AiResult = {
  text: string;
  usage: {
    totalTokenCount: number;
  };
};

type Provider = "openai" | "gemini";

function resolveProvider(meta: Meta): Provider {
  const fromEnv = (process.env.AI_PROVIDER || "").toLowerCase();
  if (fromEnv === "openai" || fromEnv === "gemini") return fromEnv;

  // fallback para meta.model
  if (meta.model === "openai" || meta.model === "gemini") return meta.model;

  // fallback final
  return "openai";
}

function resolveModel(provider: Provider): string {
  const fromEnv = process.env.AI_MODEL_DEFAULT;
  if (fromEnv && fromEnv.trim().length > 0) return fromEnv.trim();

  // defaults seguros por provider
  if (provider === "openai") {
    // pode ajustar para "gpt-4.1-mini" ou outro modelo padrão da conta
    return "gpt-4o-mini";
  }

  // gemini
  return "gemini-1.5-flash";
}

function buildSystemPrompt(meta: Meta): string {
  const locale = meta.locale || "pt-BR";
  const base =
    locale.startsWith("pt")
      ? "Você é um assistente de IA da plataforma Momentum, um SaaS financeiro para pequenos e médios negócios. Responda sempre em português do Brasil, de forma clara, objetiva e prática."
      : "You are an AI assistant for Momentum, a financial SaaS platform for small and medium businesses. Answer clearly, concisely, and practically.";

  // Pode-se refinar por promptKind se quiser, mas mantemos genérico aqui.
  return `${base}\nContexto da tarefa: ${meta.promptKind}`;
}

// --------------------------- OpenAI ---------------------------

async function callOpenAI(prompt: string, meta: Meta): Promise<AiResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const model = resolveModel("openai");
  const system = buildSystemPrompt(meta);

  const body = {
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
  };

  const res = await (globalThis as any).fetch(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `OpenAI API error: ${res.status} ${res.statusText} - ${errText}`
    );
  }

  const json: any = await res.json();
  const text: string =
    json.choices?.[0]?.message?.content ??
    json.choices?.[0]?.message?.content?.[0]?.text ??
    "";

  const totalTokens: number = json.usage?.total_tokens ?? 0;

  return {
    text: text || "",
    usage: {
      totalTokenCount: totalTokens,
    },
  };
}

// --------------------------- Gemini ---------------------------

async function callGemini(prompt: string, meta: Meta): Promise<AiResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const model = resolveModel("gemini");
  const system = buildSystemPrompt(meta);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `${system}\n\n${prompt}`,
          },
        ],
      },
    ],
  };

  const res = await (globalThis as any).fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `Gemini API error: ${res.status} ${res.statusText} - ${errText}`
    );
  }

  const json: any = await res.json();

  const candidate = json.candidates?.[0];
  const parts = candidate?.content?.parts || [];
  const text = parts
    .map((p: any) => (typeof p.text === "string" ? p.text : ""))
    .join("")
    .trim();

  // Alguns modelos Gemini expõem uso em json.usage; se não, mantemos 0.
  const totalTokens: number =
    json.usage?.totalTokens ??
    json.usage?.total_tokens ??
    json.usage?.promptTokenCount ??
    0;

  return {
    text: text || "",
    usage: {
      totalTokenCount: totalTokens,
    },
  };
}

// --------------------------- AI Client Unificado ---------------------------

/**
 * Cliente unificado para IA (Gemini / OpenAI)
 * Mantém a assinatura esperada:
 *   export async function aiClient(prompt: string, meta: Meta): Promise<AiResult>
 */
export async function aiClient(prompt: string, meta: Meta): Promise<AiResult> {
  const start = Date.now();
  const provider = resolveProvider(meta);

  try {
    let result: AiResult;

    if (provider === "openai") {
      result = await callOpenAI(prompt, meta);
    } else {
      result = await callGemini(prompt, meta);
    }

    const latency = Date.now() - start;
    const totalTokens = result.usage.totalTokenCount || 0;

    // Log de sucesso
    logger.info("AI call success", {
      tenantId: meta.tenantId,
      userId: meta.userId,
      provider,
      modelPreferred: meta.model,
      promptKind: meta.promptKind,
      latency,
      totalTokenCount: totalTokens,
    });

    // Tracking de uso (ajustado para a assinatura de 3 argumentos)
    try {
      await trackUsage(meta.tenantId, provider, totalTokens);
    } catch (trackErr: any) {
      logger.warn("AI usage tracking failed", {
        error: trackErr?.message,
        tenantId: meta.tenantId,
      });
    }

    return result;
  } catch (e: any) {
    const latency = Date.now() - start;
    logger.error("AI call failed", {
      tenantId: meta.tenantId,
      userId: meta.userId,
      provider,
      modelPreferred: meta.model,
      promptKind: meta.promptKind,
      latency,
      error: e?.message,
    });
    throw e;
  }
}

// Alias mantendo compatibilidade com código legado (se existir)
export const runGemini = aiClient;
