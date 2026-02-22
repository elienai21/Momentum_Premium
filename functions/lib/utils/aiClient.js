"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runGemini = void 0;
exports.aiClient = aiClient;
// functions/src/utils/aiClient.ts
const logger_1 = require("./logger");
const usageTracker_1 = require("./usageTracker");
const fetchWithTimeout_1 = require("./fetchWithTimeout");
const retryWithBackoff_1 = require("./retryWithBackoff");
function resolveProvider(meta) {
    const fromEnv = (process.env.AI_PROVIDER || "").toLowerCase();
    if (fromEnv === "openai" || fromEnv === "gemini")
        return fromEnv;
    // fallback para meta.model
    if (meta.model === "openai" || meta.model === "gemini")
        return meta.model;
    // fallback final
    return "openai";
}
function resolveModel(provider) {
    const fromEnv = process.env.AI_MODEL_DEFAULT;
    if (fromEnv && fromEnv.trim().length > 0)
        return fromEnv.trim();
    // defaults seguros por provider
    if (provider === "openai") {
        // pode ajustar para "gpt-4.1-mini" ou outro modelo padrão da conta
        return "gpt-4o-mini";
    }
    // gemini
    return "gemini-1.5-flash";
}
function buildSystemPrompt(meta) {
    const locale = meta.locale || "pt-BR";
    const base = locale.startsWith("pt")
        ? "Você é um assistente de IA da plataforma Momentum, um SaaS financeiro para pequenos e médios negócios. Responda sempre em português do Brasil, de forma clara, objetiva e prática."
        : "You are an AI assistant for Momentum, a financial SaaS platform for small and medium businesses. Answer clearly, concisely, and practically.";
    // Pode-se refinar por promptKind se quiser, mas mantemos genérico aqui.
    return `${base}\nContexto da tarefa: ${meta.promptKind}`;
}
// --------------------------- OpenAI ---------------------------
async function callOpenAI(prompt, meta) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("OPENAI_API_KEY is not configured");
    }
    const model = resolveModel("openai");
    const system = buildSystemPrompt(meta);
    const timeoutMs = parseInt(process.env.AI_TIMEOUT_MS || "30000", 10);
    const body = {
        model,
        messages: [
            { role: "system", content: system },
            { role: "user", content: prompt },
        ],
    };
    const res = await (0, fetchWithTimeout_1.fetchWithTimeout)("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        timeoutMs,
        errorMessage: "OpenAI API timeout",
    });
    if (!res.ok) {
        const errText = await res.text().catch(() => "");
        const errorDetails = extractProviderError(errText) || errText;
        const err = new Error(`OpenAI API error: ${res.status} ${res.statusText} - ${errorDetails}`);
        err.status = res.status;
        err.code = res.status;
        throw err;
    }
    const json = await res.json();
    const text = json.choices?.[0]?.message?.content ??
        json.choices?.[0]?.message?.content?.[0]?.text ??
        "";
    const totalTokens = json.usage?.total_tokens ?? 0;
    return {
        text: text || "",
        usage: {
            totalTokenCount: totalTokens,
        },
    };
}
// --------------------------- Gemini ---------------------------
async function callGemini(prompt, meta) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured");
    }
    const model = resolveModel("gemini");
    const system = buildSystemPrompt(meta);
    const timeoutMs = parseInt(process.env.AI_TIMEOUT_MS || "30000", 10);
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
    const res = await (0, fetchWithTimeout_1.fetchWithTimeout)(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        timeoutMs,
        errorMessage: "Gemini API timeout",
    });
    if (!res.ok) {
        const errText = await res.text().catch(() => "");
        const errorDetails = extractProviderError(errText) || errText;
        const err = new Error(`Gemini API error: ${res.status} ${res.statusText} - ${errorDetails}`);
        err.status = res.status;
        err.code = res.status;
        throw err;
    }
    const json = await res.json();
    const candidate = json.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    const text = parts
        .map((p) => (typeof p.text === "string" ? p.text : ""))
        .join("")
        .trim();
    // Alguns modelos Gemini expõem uso em json.usage; se não, mantemos 0.
    const totalTokens = json.usage?.totalTokens ??
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
async function aiClient(prompt, meta) {
    const start = Date.now();
    const provider = resolveProvider(meta);
    try {
        let result;
        result = await (0, retryWithBackoff_1.retryWithBackoff)(async () => {
            if (provider === "openai") {
                return await callOpenAI(prompt, meta);
            }
            return await callGemini(prompt, meta);
        }, {
            shouldRetry: (error) => {
                const status = error?.status || error?.statusCode || error?.code;
                return (status === 429 ||
                    status === 500 ||
                    status === 502 ||
                    status === 503 ||
                    status === 504 ||
                    error?.message?.includes("Internal error encountered") ||
                    error?.message?.includes("timeout") ||
                    error?.message?.includes("ECONNRESET") ||
                    error?.message?.includes("ETIMEDOUT"));
            },
        });
        const latency = Date.now() - start;
        const totalTokens = result.usage.totalTokenCount || 0;
        // Log de sucesso
        logger_1.logger.info("AI call success", {
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
            await (0, usageTracker_1.trackUsage)(meta.tenantId, provider, totalTokens);
        }
        catch (trackErr) {
            logger_1.logger.warn("AI usage tracking failed", {
                error: trackErr?.message,
                tenantId: meta.tenantId,
            });
        }
        return result;
    }
    catch (e) {
        const latency = Date.now() - start;
        logger_1.logger.error("AI call failed", {
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
exports.runGemini = aiClient;
function extractProviderError(rawText) {
    if (!rawText)
        return null;
    try {
        const parsed = JSON.parse(rawText);
        const message = parsed?.error?.message ||
            parsed?.message ||
            parsed?.error?.status ||
            parsed?.error?.code;
        if (typeof message === "string" && message.trim().length > 0) {
            return message.trim();
        }
        return null;
    }
    catch (error) {
        return null;
    }
}
