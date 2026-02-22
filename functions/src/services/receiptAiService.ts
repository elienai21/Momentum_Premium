import { analyzeReceiptImage } from "../ai/vision";
import {
  registerExpenseFromPayload,
  Expense,
} from "./realEstateService";
import { logger } from "../utils/logger";
import { ApiError } from "../utils/errors";

declare const fetch: any;

export type ReceiptToExpenseInput = {
  tenantId: string;
  unitCode: string;
  imageUrl: string;
  source?: string;
};

export type ReceiptAiResult = {
  expense: Expense;
  aiMetadata: {
    confidence: number;
    rawText?: string;
    model?: string;
  };
};

async function fetchImageBuffer(imageUrl: string): Promise<Buffer> {
  try {
    const res = await fetch(imageUrl);
    if (!res?.ok) {
      throw new Error(`Fetch failed with status ${res?.status}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err: any) {
    logger.error("Failed to fetch image for receipt OCR", {
      imageUrl,
      error: err?.message,
    });
    throw new ApiError(400, "Unable to download imageUrl for OCR");
  }
}

function normalizeDate(dateStr?: string): string {
  if (!dateStr) return new Date().toISOString();
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
}

function inferCategory(desc?: string, vendor?: string, fromAi?: string): string {
  const text = `${fromAi || ""} ${desc || ""} ${vendor || ""}`.toLowerCase();
  if (text.includes("condom")) return "Condomínio";
  if (text.includes("energia") || text.includes("luz")) return "Energia";
  if (text.includes("água") || text.includes("agua")) return "Água";
  if (text.includes("gás") || text.includes("gas")) return "Gás";
  if (text.includes("manuten")) return "Manutenção";
  if (text.includes("limpez")) return "Limpeza";
  return fromAi || "Outros";
}

export async function processReceiptToExpense(
  input: ReceiptToExpenseInput
): Promise<ReceiptAiResult> {
  const { tenantId, unitCode, imageUrl, source } = input;
  if (!tenantId) throw new ApiError(400, "tenantId is required");
  if (!unitCode) throw new ApiError(400, "unitCode is required");
  if (!imageUrl) throw new ApiError(400, "imageUrl is required");

  const buffer = await fetchImageBuffer(imageUrl);

  const aiResponse = await analyzeReceiptImage(buffer, {
    fileName: imageUrl,
  });

  const txn = (aiResponse as any)?.transaction || {};

  const amountNum = Number(txn.amount);
  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    throw new ApiError(422, "Valor não identificado na nota (amount ausente ou inválido)");
  }

  const incurredAt = normalizeDate(txn.date);
  const vendor: string | undefined = txn.vendor || txn.description;
  const description: string | undefined = txn.description || txn.vendor;
  const category = inferCategory(description, vendor, txn.category);

  const expense = await registerExpenseFromPayload(tenantId, {
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
      confidence: Number((aiResponse as any)?.confidence) || 0.6, // NaN coerces to 0 which is falsy, fallback to 0.6
      rawText: (aiResponse as any)?.rawText,
      model: (aiResponse as any)?.model || "gemini-2.5-flash",
    },
  };
}
