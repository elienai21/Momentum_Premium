"use strict";
// ============================================================
// 👁️ Vision AI — OCR + Inteligência Contábil Momentum (v9.5 Stable)
// ============================================================
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
exports.visionAI = visionAI;
const firebase_1 = require("../services/firebase");
const logger_1 = require("../utils/logger");
const chargeCredits_1 = require("../billing/chargeCredits");
// Lazy-load do Vision evita travar deploys
let visionClient;
async function getVisionClient() {
    if (!visionClient) {
        const vision = await Promise.resolve().then(() => __importStar(require("@google-cloud/vision")));
        visionClient = new vision.ImageAnnotatorClient();
    }
    return visionClient;
}
// ============================================================
// 🔍 OCR Inteligente — Notas, Faturas, Recibos, Boletos
// ============================================================
async function visionAI(req, res) {
    try {
        const uid = req.user?.uid;
        const tenantId = req.tenant?.info?.id;
        const plan = (req.tenant?.info?.plan || "starter");
        const { imageBase64, fileId } = req.body || {};
        if (!uid || !tenantId)
            throw new Error("Usuário ou Tenant não autenticado.");
        if (!imageBase64)
            throw new Error("Imagem não enviada.");
        const client = await getVisionClient();
        const buffer = Buffer.from(imageBase64, "base64");
        const { fullText, summary } = await (0, chargeCredits_1.chargeCredits)({
            tenantId,
            plan,
            featureKey: "vision.analyze",
            traceId: req.traceId,
            idempotencyKey: req.header("x-idempotency-key"),
        }, async () => {
            const [result] = await client.textDetection({ image: { content: buffer } });
            const text = result.fullTextAnnotation?.text || "";
            if (!text.trim()) {
                return { fullText: "", summary: "Nenhum texto detectado na imagem." };
            }
            const lines = text
                .split("\n")
                .map((l) => l.trim())
                .filter((l) => l.length > 0);
            const summaryText = buildFinanceSummary(lines);
            return { fullText: text, summary: summaryText };
        });
        // Logs de auditoria específicos do Vision (somente metadados, sem PII)
        await firebase_1.db.collection("ai_vision_logs").add({
            fileId: fileId || null,
            tenantId,
            timestamp: Date.now(),
            status: "success",
            confidenceScore: summary ? 0.9 : 0.5,
            detectedType: "invoice",
        });
        logger_1.logger.info("📸 VisionAI processado com sucesso", { uid, tenantId });
        res.json({ ok: true, extracted: fullText, summary });
    }
    catch (error) {
        logger_1.logger.error("❌ VisionAI falhou", { error: error.message });
        res.status(error.status || 500).json({
            ok: false,
            code: error.code || "VISION_ERROR",
            message: error.message
        });
    }
}
// ============================================================
// 🧠 Mini interpretador contábil
// ============================================================
function buildFinanceSummary(lines) {
    const summaryParts = [];
    const totalLine = lines.find((l) => /total|valor/i.test(l));
    const cnpj = lines.find((l) => /(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/.test(l));
    const date = lines.find((l) => /\d{2}\/\d{2}\/\d{4}/.test(l));
    if (cnpj)
        summaryParts.push(`CNPJ detectado: ${cnpj}`);
    if (date)
        summaryParts.push(`Data da nota: ${date}`);
    if (totalLine)
        summaryParts.push(`Possível valor total: ${totalLine}`);
    if (summaryParts.length === 0)
        return "Texto detectado, mas sem informações contábeis relevantes.";
    return summaryParts.join("\n");
}
