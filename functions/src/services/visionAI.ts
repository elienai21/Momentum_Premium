// ============================================================
// 👁️ Vision AI — OCR + Inteligência Contábil Momentum (v10.0 Gemini Build)
// ============================================================

import { Response, Request } from "express";
import { db } from "src/services/firebase";
import { logger } from "../utils/logger";
import { chargeCredits } from "../billing/chargeCredits";
import type { PlanTier } from "../billing/creditsTypes";
import { analyzeReceiptImage } from "../ai/vision";

// ============================================================
// 🔍 OCR Inteligente — Notas, Faturas, Recibos, Boletos
// ============================================================
export async function visionAI(req: Request, res: Response) {
  try {
    const uid = req.user?.uid;
    const tenantId = req.tenant?.info?.id;
    const plan = (req.tenant?.info?.plan || "starter") as PlanTier;
    const { imageBase64, fileId } = req.body || {};

    if (!uid || !tenantId) throw new Error("Usuário ou Tenant não autenticado.");
    if (!imageBase64) throw new Error("Imagem não enviada.");

    // Converte uma única vez para buffer para evitar duplicatas em memória
    const buffer = Buffer.from(imageBase64, "base64");

    const result = await chargeCredits(
      {
        tenantId,
        plan,
        featureKey: "vision.analyze",
        traceId: req.traceId,
        idempotencyKey: req.header("x-idempotency-key"),
      },
      async () => {
        // Usa o motor de Visão do Gemini (Multimodal) via analyzeReceiptImage
        // Isso substitui Regex e melhora drasticamente a precisão
        const aiResponse = (await analyzeReceiptImage(buffer, {
          fileName: fileId || "upload.jpg",
          uid,
        })) as any;

        const txn = aiResponse.transaction || {};

        // Constrói resumo formatado a partir dos dados estruturados da IA
        const summaryParts: string[] = [];
        if (txn.description) summaryParts.push(`Estabelecimento: ${txn.description}`);
        if (txn.date) summaryParts.push(`Data: ${txn.date}`);
        if (txn.amount) summaryParts.push(`Valor: R$ ${Number(txn.amount).toFixed(2)}`);
        if (txn.category) summaryParts.push(`Categoria sugerida: ${txn.category}`);

        const summary = summaryParts.length > 0
          ? summaryParts.join("\n")
          : "Não foi possível extrair dados financeiros claros desta imagem.";

        return { summary, raw: aiResponse };
      }
    );

    // Logs de auditoria específicos do Vision (somente metadados, sem PII)
    await db.collection("ai_vision_logs").add({
      fileId: fileId || null,
      tenantId,
      timestamp: Date.now(),
      status: "success",
      confidenceScore: result.summary.includes("Não foi possível") ? 0.5 : 0.9,
      detectedType: "invoice",
      model: "gemini-2.5-flash",
    });

    logger.info("📸 VisionAI processado com sucesso via Gemini", { uid, tenantId, traceId: req.traceId });
    res.json({ ok: true, summary: result.summary });
  } catch (error: any) {
    logger.error("❌ VisionAI falhou", { error: error.message, traceId: req.traceId });
    res.status(error.status || 500).json({
      ok: false,
      code: error.code || "VISION_ERROR",
      message: error.message
    });
  }
}
