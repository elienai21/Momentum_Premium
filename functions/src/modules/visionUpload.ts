import { db } from "src/services/firebase";
// ============================
// 🧾 Vision Upload — Receipt Parser API (v7.9 Final)
// ============================

import { Router } from "express";
import Busboy from "busboy";
import { requireAuth } from "../middleware/requireAuth";
import { logger } from "../utils/logger";
import { analyzeReceiptImage } from "../ai/vision";

export const visionUploadRouter = Router();

visionUploadRouter.post("/vision/parse", requireAuth, async (req, res, next) => {
  try {
    const bb = Busboy({ headers: req.headers } as any);
    let imageBuffer: Buffer | null = null;
    let fileName = "receipt.jpg";

    await new Promise<void>((resolve, reject) => {
      bb.on("file", (_name: string, file: any, info: any) => {
        fileName = info.filename || fileName;
        const chunks: Buffer[] = [];
        file.on("data", (d: Buffer) => chunks.push(d));
        file.on("end", () => (imageBuffer = Buffer.concat(chunks)));
      });
      bb.on("error", reject);
      bb.on("finish", resolve);
      req.pipe(bb);
    });

    if (!imageBuffer) {
      return res.status(400).json({ ok: false, error: "Missing image file" });
    }

    const userId = (req as any)?.user?.uid ?? "anonymous";

    const result = await analyzeReceiptImage(imageBuffer, { fileName, uid: userId });

    return res.json({ ok: true, ...result });
  } catch (err: any) {
    logger.error("Vision parse failed", { error: err.message });
    next(err);
  }
});



