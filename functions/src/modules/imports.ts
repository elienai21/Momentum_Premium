// functions/src/modules/imports.ts
// ============================
// 📥 Imports Module — Importação de Contas (Excel/CSV/Sheets via JSON)
// ============================

import { Router, Request, Response, NextFunction } from "express";
import "../types";
import { z } from "zod";
import { db } from "src/services/firebase";

import { requireAuth } from "../middleware/requireAuth";
import { withTenant } from "../middleware/withTenant";
import { ApiError } from "../utils/errors";
import { logger } from "../utils/logger";
import { logActionFromRequest } from "./audit/auditService";

export const importsRouter = Router();

// Todas as rotas de importação exigem auth + tenant
importsRouter.use(requireAuth, withTenant);

// ============================
// 🔹 Schemas de payload
// ============================

/**
 * Cada linha importada vem como um objeto "solto" (record),
 * e nós tentamos normalizar esses campos:
 *
 * - descrição  -> description | Descrição | desc | ...
 * - valor      -> amount | valor | value
 * - vencimento -> dueDate | data | dt_vencimento
 * - tipo       -> type | tipo ("payable"/"receivable")
 * - método     -> method | método
 * - referência -> reference | ref | documento
 * - notas      -> notes | observações
 */
const importPayloadSchema = z.object({
  rows: z.array(z.record(z.any())).min(1).max(500),
  options: z
    .object({
      defaultType: z.enum(["payable", "receivable"]).optional(),
      defaultMethod: z.string().optional(),
    })
    .optional(),
});

// ============================
// 🧠 Normalização de linhas
// ============================

interface NormalizedAccountRow {
  description: string;
  amount: number;
  dueDate: string;
  type: "payable" | "receivable";
  method?: string;
  reference?: string;
  notes?: string;
}

/**
 * Tenta normalizar uma linha genérica em algo que o módulo de contas entende.
 * Se não conseguir, lança um erro com mensagem amigável.
 */
function normalizeRowToAccount(
  row: Record<string, any>,
  options?: { defaultType?: "payable" | "receivable"; defaultMethod?: string }
): NormalizedAccountRow {
  const getFirst = (...keys: string[]): any => {
    for (const k of keys) {
      if (row[k] !== undefined && row[k] !== null && row[k] !== "") {
        return row[k];
      }
    }
    return undefined;
  };

  // descrição
  const rawDescription = getFirst(
    "description",
    "descrição",
    "Descrição",
    "desc",
    "nome",
    "detalhe",
    "history",
    "historico",
    "Histórico"
  );
  const description = String(rawDescription ?? "").trim();
  if (!description) {
    throw new Error("Descrição ausente ou vazia.");
  }

  // valor
  const rawAmount = getFirst("amount", "valor", "value", "Valor", "vl", "total");
  if (rawAmount === undefined || rawAmount === null || rawAmount === "") {
    throw new Error("Valor ausente.");
  }

  let amountNum: number;
  if (typeof rawAmount === "number") {
    amountNum = rawAmount;
  } else if (typeof rawAmount === "string") {
    const cleaned = rawAmount.replace(/\./g, "").replace(",", ".");
    amountNum = parseFloat(cleaned);
  } else {
    throw new Error("Valor em formato inválido.");
  }
  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    throw new Error("Valor inválido ou não positivo.");
  }

  // tipo
  const rawType = (getFirst("type", "tipo", "kind") ??
    options?.defaultType) as string | undefined;

  let type: "payable" | "receivable";
  if (!rawType) {
    // fallback pelo sinal (se vier valor negativo)
    type = amountNum < 0 ? "payable" : "receivable";
  } else {
    const t = String(rawType).toLowerCase();
    if (["pagar", "pay", "payable", "despesa", "expense"].includes(t)) {
      type = "payable";
    } else if (
      ["receber", "receive", "receivable", "receita", "income"].includes(t)
    ) {
      type = "receivable";
    } else {
      throw new Error(
        `Tipo inválido: '${rawType}'. Use 'payable' ou 'receivable'.`
      );
    }
  }

  // data de vencimento (mantemos como string, o front pode garantir o formato)
  const rawDueDate = getFirst(
    "dueDate",
    "vencimento",
    "data_vencimento",
    "data",
    "date",
    "dt_venc"
  );
  const dueDate = String(rawDueDate ?? "").trim();
  if (!dueDate) {
    throw new Error("Data de vencimento ausente.");
  }

  // método / referência / notas
  const method =
    (getFirst("method", "método", "forma_pagamento") as string | undefined) ??
    options?.defaultMethod;
  const reference = getFirst(
    "reference",
    "ref",
    "documento",
    "nota",
    "nfe",
    "invoice"
  ) as string | undefined;
  const notes = getFirst("notes", "observações", "obs") as string | undefined;

  return {
    description,
    amount: Math.abs(amountNum),
    dueDate,
    type,
    method,
    reference,
    notes,
  };
}

// ============================
// 🔍 POST /imports/accounts/preview
// Faz a validação e normalização sem gravar no banco
// ============================

importsRouter.post(
  "/accounts/preview",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.tenant || !req.tenant.info?.id) {
        throw new ApiError(400, "Tenant context is required.");
      }

      const tenantId = req.tenant.info.id;
      const parsed = importPayloadSchema.parse(req.body || {});
      const { rows, options } = parsed;

      const valid: Array<NormalizedAccountRow & { rowIndex: number }> = [];
      const invalid: Array<{ rowIndex: number; error: string }> = [];

      rows.forEach((row, index) => {
        try {
          const normalized = normalizeRowToAccount(row, options);
          valid.push({ ...normalized, rowIndex: index });
        } catch (err: any) {
          const message =
            err?.message || "Erro desconhecido ao processar linha.";

          // 🔎 Log detalhado por linha inválida (preview)
          logger.error("[imports.preview] Falha ao normalizar linha", {
            tenantId,
            rowIndex: index,
            error: message,
            rowSample: JSON.stringify(row).slice(0, 500),
            traceId: (req as any).traceId,
          });

          invalid.push({
            rowIndex: index,
            error: message,
          });
        }
      });

      await logActionFromRequest(req, "import.accounts.preview", {
        tenantId,
        totalRows: rows.length,
        validCount: valid.length,
        invalidCount: invalid.length,
      });

      res.json({
        ok: true,
        summary: {
          totalRows: rows.length,
          valid: valid.length,
          invalid: invalid.length,
        },
        valid,
        invalid,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ============================
// ✅ POST /imports/accounts/commit
// Grava as contas normalizadas em tenants/{tenantId}/accounts
// ============================

importsRouter.post(
  "/accounts/commit",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.tenant || !req.tenant.info?.id) {
        throw new ApiError(400, "Tenant context is required.");
      }
      if (!req.user || !req.user.uid) {
        throw new ApiError(401, "Authentication is required.");
      }

      const tenantId = req.tenant.info.id;
      const userEmail = req.user.email ?? "anon";

      const parsed = importPayloadSchema.parse(req.body || {});
      const { rows, options } = parsed;

      const dualValidation = req.tenant.info.features?.dualValidation || false;
      const now = new Date().toISOString();

      const batch = db.batch();
      const accountsCol = db.collection(`tenants/${tenantId}/accounts`);

      let successCount = 0;
      const errors: Array<{ rowIndex: number; error: string }> = [];

      rows.forEach((row, index) => {
        try {
          const normalized = normalizeRowToAccount(row, options);

          const docRef = accountsCol.doc();
          const accountDoc: Record<string, any> = {
            type: normalized.type,
            description: normalized.description,
            amount: normalized.amount,
            dueDate: normalized.dueDate,
            method: normalized.method ?? null,
            reference: normalized.reference ?? null,
            notes: normalized.notes ?? null,
            status: "pending",
            dualValidation,
            createdAt: now,
            createdBy: userEmail,
            isImported: true,
            importSource: "manual_file",
          };

          batch.set(docRef, accountDoc);
          successCount++;
        } catch (err: any) {
          const message =
            err?.message || "Erro ao normalizar linha para commit.";

          // 🔎 Log detalhado por linha inválida (commit)
          logger.error("[imports.commit] Falha ao normalizar linha", {
            tenantId,
            rowIndex: index,
            error: message,
            rowSample: JSON.stringify(row).slice(0, 500),
            traceId: (req as any).traceId,
          });

          errors.push({
            rowIndex: index,
            error: message,
          });
        }
      });

      if (successCount === 0) {
        throw new ApiError(
          400,
          "Nenhuma linha válida para importação. Verifique o arquivo enviado."
        );
      }

      await batch.commit();

      await logActionFromRequest(req, "import.accounts.commit", {
        tenantId,
        totalRows: rows.length,
        successCount,
        errorCount: errors.length,
      });

      res.json({
        ok: true,
        imported: successCount,
        errors,
      });
    } catch (err) {
      next(err);
    }
  }
);

export const router = importsRouter;

