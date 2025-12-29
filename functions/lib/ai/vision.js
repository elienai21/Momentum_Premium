"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeReceiptImage = analyzeReceiptImage;
// ============================
// 👁️ Gemini Vision Parser — Momentum AI (v7.9.1 Clean Build)
// ============================
const generative_ai_1 = require("@google/generative-ai");
const withSecrets_1 = require("../middleware/withSecrets");
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
/**
 * Inicializa cliente do Gemini Vision
 */
function getGeminiClient() {
    const apiKey = withSecrets_1.GEMINI_KEY.value();
    if (!apiKey) {
        throw new errors_1.ApiError(500, "GEMINI_KEY não configurada no Secret Manager.");
    }
    return new generative_ai_1.GoogleGenerativeAI(apiKey);
}
/**
 * Analisa uma imagem de recibo e extrai dados financeiros
 */
async function analyzeReceiptImage(imageBuffer, meta) {
    if (!imageBuffer) {
        throw new errors_1.ApiError(400, "Imagem não recebida para análise.");
    }
    try {
        const { retryWithBackoff } = await Promise.resolve().then(() => __importStar(require("../utils/retryWithBackoff")));
        return await retryWithBackoff(async () => {
            const gemini = getGeminiClient();
            const model = gemini.getGenerativeModel({
                model: "gemini-2.5-flash",
                safetySettings: [
                    {
                        category: generative_ai_1.HarmCategory.HARM_CATEGORY_HARASSMENT,
                        threshold: generative_ai_1.HarmBlockThreshold.BLOCK_ONLY_HIGH,
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
            // Add timeout wrapper (30s default for vision processing)
            const timeoutMs = parseInt(process.env.VISION_TIMEOUT_MS || "30000", 10);
            let timeoutHandle;
            const timeoutPromise = new Promise((_, reject) => {
                timeoutHandle = setTimeout(() => reject(new Error("Vision API timeout")), timeoutMs);
            });
            const resultPromise = model.generateContent([
                { inlineData: { data: base64Data, mimeType: "image/jpeg" } },
                { text: prompt },
            ]).finally(() => clearTimeout(timeoutHandle));
            const result = await Promise.race([resultPromise, timeoutPromise]);
            const text = result.response.text().trim();
            if (!text)
                throw new errors_1.ApiError(500, "A IA não retornou dados do recibo.");
            const jsonText = text.replace(/```json|```/g, "").trim();
            const parsed = JSON.parse(jsonText);
            logger_1.logger.info("Gemini Vision parsed receipt", {
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
    }
    catch (error) {
        // Log only error type and basic info, not full stack or sensitive data
        logger_1.logger.error("Erro ao processar imagem com Gemini Vision", {
            errorType: error.name,
            errorMessage: error.message?.substring(0, 100), // Limit message length
        });
        if (error.message?.includes("SAFETY")) {
            throw new errors_1.ApiError(400, "Imagem bloqueada por segurança.");
        }
        if (error.message?.includes("timeout")) {
            throw new errors_1.ApiError(504, "Timeout ao processar imagem. Tente novamente.");
        }
        throw new errors_1.ApiError(503, "O serviço de visão do Gemini está indisponível.");
    }
}
