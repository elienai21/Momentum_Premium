"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runDualAI = runDualAI;
// ============================
// 🤖 dualClient.ts — AI Provider Bridge (v7.9)
// ============================
const openai_1 = __importDefault(require("openai"));
const generative_ai_1 = require("@google/generative-ai");
const withSecrets_1 = require("../middleware/withSecrets");
const usageTracker_1 = require("../utils/usageTracker");
const logger_1 = require("../utils/logger");
let openai = null;
let gemini = null;
/**
 * Inicializa clientes apenas uma vez (lazy init).
 */
function ensureClients() {
    if (!openai)
        openai = new openai_1.default({ apiKey: withSecrets_1.OPENAI_KEY.value() });
    if (!gemini)
        gemini = new generative_ai_1.GoogleGenerativeAI(withSecrets_1.GEMINI_KEY.value());
}
/**
 * Executa IA de forma adaptativa entre OpenAI e Gemini.
 */
async function runDualAI(opts) {
    ensureClients();
    const { prompt, provider, tenantId } = opts;
    try {
        let text = "";
        let tokens = 0;
        if (provider === "openai") {
            const out = await openai.chat.completions.create({
                model: "gpt-5",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.2,
            });
            text = out.choices?.[0]?.message?.content ?? "";
            tokens = out.usage?.total_tokens ?? 0;
        }
        else {
            const model = gemini.getGenerativeModel({ model: "gemini-2.5-pro" });
            const result = await model.generateContent(prompt);
            text = result.response.text();
            tokens = result.response.usageMetadata?.totalTokenCount ?? 0;
        }
        await (0, usageTracker_1.trackUsage)(tenantId, provider, tokens);
        logger_1.logger.info("DualAI success", { provider, tokens });
        return { text, tokens, provider };
    }
    catch (e) {
        logger_1.logger.error("DualAI error", { error: e?.message || e, provider });
        return {
            text: "Não foi possível gerar a análise no momento.",
            tokens: 0,
            provider,
        };
    }
}
