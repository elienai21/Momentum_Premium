// functions/src/modules/ai.ts
import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth";
import { withTenant } from "../middleware/withTenant";
import { requireFeature } from "../middleware/requireFeature";
import { analyzeReceiptImage } from "../ai/vision";
import { logger } from "../utils/logger";
import { ApiError } from "../utils/errors";
import { processReceiptToExpense } from "../services/receiptAiService";
import "../types";

export const aiRouter = Router();

// Segurança e contexto
aiRouter.use(requireAuth, withTenant);

const parseReceiptSchema = z.object({
  image: z.string().min(10, "Imagem base64 obrigatória."),
  mimeType: z.string().startsWith("image/", { message: "Formato inválido de imagem." }),
});

const receiptToExpenseSchema = z.object({
  unitCode: z.string().min(1),
  imageUrl: z.string().url(),
  source: z.string().optional(),
});

// POST /ai/parse-receipt
aiRouter.post(
  "/parse-receipt",
  requireFeature("ai_receipt_parsing"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.tenant) throw new ApiError(400, "Tenant context required.");
      const tenantId = req.tenant.info.id;
      const userId = req.user?.uid ?? "anonymous";

      const { image, mimeType } = parseReceiptSchema.parse(req.body);
      const buffer = Buffer.from(image, "base64");

      const result = await analyzeReceiptImage(buffer, {
        fileName: "uploaded-receipt.jpg",
        uid: userId,
      });

      logger.info("Receipt parsed successfully", {
        tenantId,
        userId,
        mimeType,
        extractedKeys: Object.keys(result.transaction || {}),
      });

      res.json({
        ok: true,
        data: result,
        traceId: req.traceId,
      });
    } catch (err: any) {
      logger.error("AI parse receipt failed", { error: err.message });
      next(err);
    }
  }
);

// POST /ai/receipt-to-expense
aiRouter.post(
  "/receipt-to-expense",
  requireFeature("ai_receipt_parsing"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.tenant) throw new ApiError(400, "Tenant context required.");
      const tenantId = req.tenant.info.id;

      const { unitCode, imageUrl, source } = receiptToExpenseSchema.parse(req.body);

      const result = await processReceiptToExpense({
        tenantId,
        unitCode,
        imageUrl,
        source,
      });

      res.json({
        ok: true,
        expense: result.expense,
        aiMetadata: result.aiMetadata,
        traceId: req.traceId,
      });
    } catch (err: any) {
      logger.error("AI receipt-to-expense failed", { error: err?.message });
      next(err);
    }
  }
);

export const router = aiRouter;
