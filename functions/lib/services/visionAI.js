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
const checkPlan_1 = require("../middleware/checkPlan");
const firebase_1 = require("../services/firebase");
const logger_1 = require("../utils/logger");
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
        const { imageBase64 } = req.body;
        if (!uid)
            throw new Error("Usuário não autenticado.");
        if (!imageBase64)
            throw new Error("Imagem não enviada.");
        await (0, checkPlan_1.checkPlanLimit)(uid, 200, "visionAI");
        const buffer = Buffer.from(imageBase64, "base64");
        const client = await getVisionClient();
        const [result] = await client.textDetection({ image: { content: buffer } });
        const fullText = result.fullTextAnnotation?.text || "";
        if (!fullText.trim()) {
            return res.json({
                ok: true,
                extracted: "",
                summary: "Nenhum texto detectado na imagem.",
            });
        }
        const lines = fullText
            .split("\n")
            .map((l) => l.trim())
            .filter((l) => l.length > 0);
        const summary = buildFinanceSummary(lines);
        await firebase_1.db.collection("ai_vision_logs").add({
            uid,
            extracted: fullText.slice(0, 5000),
            summary,
            timestamp: Date.now(),
        });
        logger_1.logger.info("📸 VisionAI processado com sucesso", { uid });
        res.json({ ok: true, extracted: fullText, summary });
    }
    catch (error) {
        logger_1.logger.error("❌ VisionAI falhou", { error: error.message });
        res.status(500).json({ ok: false, error: error.message });
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
