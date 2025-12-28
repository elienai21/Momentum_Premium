"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = exports.aiRouter = void 0;
// functions/src/modules/ai.ts
const express_1 = require("express");
const zod_1 = require("zod");
const requireAuth_1 = require("../middleware/requireAuth");
const withTenant_1 = require("../middleware/withTenant");
const requireFeature_1 = require("../middleware/requireFeature");
const vision_1 = require("../ai/vision");
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
const receiptAiService_1 = require("../services/receiptAiService");
require("../types");
exports.aiRouter = (0, express_1.Router)();
// Segurança e contexto
exports.aiRouter.use(requireAuth_1.requireAuth, withTenant_1.withTenant);
const parseReceiptSchema = zod_1.z.object({
    image: zod_1.z.string().min(10, "Imagem base64 obrigatória."),
    mimeType: zod_1.z.string().startsWith("image/", { message: "Formato inválido de imagem." }),
});
const receiptToExpenseSchema = zod_1.z.object({
    unitCode: zod_1.z.string().min(1),
    imageUrl: zod_1.z.string().url(),
    source: zod_1.z.string().optional(),
});
// POST /ai/parse-receipt
exports.aiRouter.post("/parse-receipt", (0, requireFeature_1.requireFeature)("ai_receipt_parsing"), async (req, res, next) => {
    try {
        if (!req.tenant)
            throw new errors_1.ApiError(400, "Tenant context required.");
        const tenantId = req.tenant.info.id;
        const userId = req.user?.uid ?? "anonymous";
        const { image, mimeType } = parseReceiptSchema.parse(req.body);
        const buffer = Buffer.from(image, "base64");
        const result = await (0, vision_1.analyzeReceiptImage)(buffer, {
            fileName: "uploaded-receipt.jpg",
            uid: userId,
        });
        logger_1.logger.info("Receipt parsed successfully", {
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
    }
    catch (err) {
        logger_1.logger.error("AI parse receipt failed", { error: err.message });
        next(err);
    }
});
// POST /ai/receipt-to-expense
exports.aiRouter.post("/receipt-to-expense", (0, requireFeature_1.requireFeature)("ai_receipt_parsing"), async (req, res, next) => {
    try {
        if (!req.tenant)
            throw new errors_1.ApiError(400, "Tenant context required.");
        const tenantId = req.tenant.info.id;
        const { unitCode, imageUrl, source } = receiptToExpenseSchema.parse(req.body);
        const result = await (0, receiptAiService_1.processReceiptToExpense)({
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
    }
    catch (err) {
        logger_1.logger.error("AI receipt-to-expense failed", { error: err?.message });
        next(err);
    }
});
exports.router = exports.aiRouter;
