"use strict";
// ============================================================
// 👁️ Vision AI — OCR + Inteligência Contábil Momentum (v10.0 Gemini Build)
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.visionAI = visionAI;
const firebase_1 = require("../services/firebase");
const logger_1 = require("../utils/logger");
const chargeCredits_1 = require("../billing/chargeCredits");
const vision_1 = require("../ai/vision");
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
        // Converte uma única vez para buffer para evitar duplicatas em memória
        const buffer = Buffer.from(imageBase64, "base64");
        const result = await (0, chargeCredits_1.chargeCredits)({
            tenantId,
            plan,
            featureKey: "vision.analyze",
            traceId: req.traceId,
            idempotencyKey: req.header("x-idempotency-key"),
        }, async () => {
            // Usa o motor de Visão do Gemini (Multimodal) via analyzeReceiptImage
            // Isso substitui Regex e melhora drasticamente a precisão
            const aiResponse = (await (0, vision_1.analyzeReceiptImage)(buffer, {
                fileName: fileId || "upload.jpg",
                uid,
            }));
            const txn = aiResponse.transaction || {};
            // Constrói resumo formatado a partir dos dados estruturados da IA
            const summaryParts = [];
            if (txn.description)
                summaryParts.push(`Estabelecimento: ${txn.description}`);
            if (txn.date)
                summaryParts.push(`Data: ${txn.date}`);
            if (txn.amount)
                summaryParts.push(`Valor: R$ ${Number(txn.amount).toFixed(2)}`);
            if (txn.category)
                summaryParts.push(`Categoria sugerida: ${txn.category}`);
            const summary = summaryParts.length > 0
                ? summaryParts.join("\n")
                : "Não foi possível extrair dados financeiros claros desta imagem.";
            return { summary, raw: aiResponse };
        });
        // Logs de auditoria específicos do Vision (somente metadados, sem PII)
        await firebase_1.db.collection("ai_vision_logs").add({
            fileId: fileId || null,
            tenantId,
            timestamp: Date.now(),
            status: "success",
            confidenceScore: result.summary.includes("Não foi possível") ? 0.5 : 0.9,
            detectedType: "invoice",
            model: "gemini-2.5-flash",
        });
        logger_1.logger.info("📸 VisionAI processado com sucesso via Gemini", { uid, tenantId, traceId: req.traceId });
        res.json({ ok: true, summary: result.summary });
    }
    catch (error) {
        logger_1.logger.error("❌ VisionAI falhou", { error: error.message, traceId: req.traceId });
        res.status(error.status || 500).json({
            ok: false,
            code: error.code || "VISION_ERROR",
            message: error.message
        });
    }
}
