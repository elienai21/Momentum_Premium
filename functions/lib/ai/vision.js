"use strict";
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
        // ✅ Corrigido: Estrutura compatível com o SDK atual
        const result = await model.generateContent([
            { inlineData: { data: base64Data, mimeType: "image/jpeg" } },
            { text: prompt },
        ]);
        const text = result.response.text().trim();
        if (!text)
            throw new errors_1.ApiError(500, "A IA não retornou dados do recibo.");
        const jsonText = text.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(jsonText);
        logger_1.logger.info("Gemini Vision parsed receipt", {
            file: meta?.fileName,
            uid: meta?.uid,
            keys: Object.keys(parsed),
        });
        return parsed;
    }
    catch (error) {
        logger_1.logger.error("Erro ao processar imagem com Gemini Vision", { error: error.message });
        if (error.message?.includes("SAFETY")) {
            throw new errors_1.ApiError(400, "Imagem bloqueada por segurança.");
        }
        throw new errors_1.ApiError(503, "O serviço de visão do Gemini está indisponível.");
    }
}
