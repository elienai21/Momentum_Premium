// ============================================================
// 👁️ Vision AI — OCR + Inteligência Contábil Momentum (v9.5 Stable)
// ============================================================

import { Response } from "express";
import { db } from "src/services/firebase";
import { logger } from "../utils/logger";
import { chargeCredits } from "../billing/chargeCredits";
import type { PlanTier } from "../billing/creditsTypes";

// Lazy-load do Vision evita travar deploys
let visionClient: any;
async function getVisionClient() {
  if (!visionClient) {
    const vision = await import("@google-cloud/vision");
    visionClient = new vision.ImageAnnotatorClient();
  }
  return visionClient;
}

// ============================================================
// 🔍 OCR Inteligente — Notas, Faturas, Recibos, Boletos
// ============================================================
export async function visionAI(req: any, res: Response) {
  try {
    const uid = req.user?.uid;
    const tenantId = req.tenant?.info?.id;
    const plan = (req.tenant?.info?.plan || "starter") as PlanTier;
    const { imageBase64 } = req.body;

    if (!uid || !tenantId) throw new Error("Usuário ou Tenant não autenticado.");
    if (!imageBase64) throw new Error("Imagem não enviada.");

    const client = await getVisionClient();
    const buffer = Buffer.from(imageBase64, "base64");

    const { fullText, summary } = await chargeCredits(
      {
        tenantId,
        plan,
        featureKey: "vision.analyze",
        traceId: req.traceId,
        idempotencyKey: req.header("x-idempotency-key"),
      },
      async () => {
        const [result] = await client.textDetection({ image: { content: buffer } });
        const text = result.fullTextAnnotation?.text || "";

        if (!text.trim()) {
          return { fullText: "", summary: "Nenhum texto detectado na imagem." };
        }

        const lines = text
          .split("\n")
          .map((l: string) => l.trim())
          .filter((l: string) => l.length > 0);

        const summaryText = buildFinanceSummary(lines);
        return { fullText: text, summary: summaryText };
      }
    );

    // Logs de auditoria específicos do Vision
    await db.collection("ai_vision_logs").add({
      uid,
      tenantId,
      extracted: fullText.slice(0, 5000),
      summary,
      timestamp: Date.now(),
    });

    logger.info("📸 VisionAI processado com sucesso", { uid, tenantId });
    res.json({ ok: true, extracted: fullText, summary });
  } catch (error: any) {
    logger.error("❌ VisionAI falhou", { error: error.message });
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
function buildFinanceSummary(lines: string[]): string {
  const summaryParts: string[] = [];

  const totalLine = lines.find((l) => /total|valor/i.test(l));
  const cnpj = lines.find((l) => /(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/.test(l));
  const date = lines.find((l) => /\d{2}\/\d{2}\/\d{4}/.test(l));

  if (cnpj) summaryParts.push(`CNPJ detectado: ${cnpj}`);
  if (date) summaryParts.push(`Data da nota: ${date}`);
  if (totalLine) summaryParts.push(`Possível valor total: ${totalLine}`);

  if (summaryParts.length === 0)
    return "Texto detectado, mas sem informações contábeis relevantes.";

  return summaryParts.join("\n");
}
