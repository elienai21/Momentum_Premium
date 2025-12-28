// ============================================================
// 👁️ Vision AI — OCR + Inteligência Contábil Momentum (v9.5 Stable)
// ============================================================

import { Request, Response } from "express";
import { checkPlanLimit } from "../middleware/checkPlan";
import { db } from "src/services/firebase";
import { logger } from "../utils/logger";

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
export async function visionAI(req: Request, res: Response) {
  try {
    const uid = req.user?.uid;
    const { imageBase64 } = req.body;

    if (!uid) throw new Error("Usuário não autenticado.");
    if (!imageBase64) throw new Error("Imagem não enviada.");

    await checkPlanLimit(uid, 200, "visionAI");

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
      .map((l: string) => l.trim())
      .filter((l: string) => l.length > 0);


    const summary = buildFinanceSummary(lines);

    await db.collection("ai_vision_logs").add({
      uid,
      extracted: fullText.slice(0, 5000),
      summary,
      timestamp: Date.now(),
    });

    logger.info("📸 VisionAI processado com sucesso", { uid });
    res.json({ ok: true, extracted: fullText, summary });
  } catch (error: any) {
    logger.error("❌ VisionAI falhou", { error: error.message });
    res.status(500).json({ ok: false, error: error.message });
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

