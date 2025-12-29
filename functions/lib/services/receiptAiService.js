"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processReceiptToExpense = processReceiptToExpense;
const vision_1 = require("../ai/vision");
const realEstateService_1 = require("./realEstateService");
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
async function fetchImageBuffer(imageUrl) {
    try {
        const res = await fetch(imageUrl);
        if (!res?.ok) {
            throw new Error(`Fetch failed with status ${res?.status}`);
        }
        const arrayBuffer = await res.arrayBuffer();
        return Buffer.from(arrayBuffer);
    }
    catch (err) {
        logger_1.logger.error("Failed to fetch image for receipt OCR", {
            imageUrl,
            error: err?.message,
        });
        throw new errors_1.ApiError(400, "Unable to download imageUrl for OCR");
    }
}
function normalizeDate(dateStr) {
    if (!dateStr)
        return new Date().toISOString();
    const parsed = new Date(dateStr);
    if (Number.isNaN(parsed.getTime()))
        return new Date().toISOString();
    return parsed.toISOString();
}
function inferCategory(desc, vendor, fromAi) {
    const text = `${fromAi || ""} ${desc || ""} ${vendor || ""}`.toLowerCase();
    if (text.includes("condom"))
        return "Condomínio";
    if (text.includes("energia") || text.includes("luz"))
        return "Energia";
    if (text.includes("água") || text.includes("agua"))
        return "Água";
    if (text.includes("gás") || text.includes("gas"))
        return "Gás";
    if (text.includes("manuten"))
        return "Manutenção";
    if (text.includes("limpez"))
        return "Limpeza";
    return fromAi || "Outros";
}
async function processReceiptToExpense(input) {
    const { tenantId, unitCode, imageUrl, source } = input;
    if (!tenantId)
        throw new errors_1.ApiError(400, "tenantId is required");
    if (!unitCode)
        throw new errors_1.ApiError(400, "unitCode is required");
    if (!imageUrl)
        throw new errors_1.ApiError(400, "imageUrl is required");
    const buffer = await fetchImageBuffer(imageUrl);
    const aiResponse = await (0, vision_1.analyzeReceiptImage)(buffer, {
        fileName: imageUrl,
    });
    const txn = aiResponse?.transaction || {};
    const amountNum = Number(txn.amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
        throw new errors_1.ApiError(422, "Valor não identificado na nota (amount ausente ou inválido)");
    }
    const incurredAt = normalizeDate(txn.date);
    const vendor = txn.vendor || txn.description;
    const description = txn.description || txn.vendor;
    const category = inferCategory(description, vendor, txn.category);
    const expense = await (0, realEstateService_1.registerExpenseFromPayload)(tenantId, {
        unitCode,
        category,
        amount: amountNum,
        incurredAt,
        description,
        vendor,
        source: source || "ReceiptOCR",
    });
    return {
        expense,
        aiMetadata: {
            confidence: Number(aiResponse?.confidence) || 0.6,
            rawText: aiResponse?.rawText,
            model: aiResponse?.model || "gemini-2.5-flash",
        },
    };
}
