"use strict";
// functions/src/modules/imports.ts
// ============================
// 📥 Imports Module — Importação de Contas (Excel/CSV/Sheets via JSON)
// ============================
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = exports.importsRouter = void 0;
const express_1 = require("express");
require("../types");
const zod_1 = require("zod");
const firebase_1 = require("../services/firebase");
const requireAuth_1 = require("../middleware/requireAuth");
const withTenant_1 = require("../middleware/withTenant");
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
const auditService_1 = require("../modules/audit/auditService");
exports.importsRouter = (0, express_1.Router)();
// Todas as rotas de importação exigem auth + tenant
exports.importsRouter.use(requireAuth_1.requireAuth, withTenant_1.withTenant);
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
const importPayloadSchema = zod_1.z.object({
    rows: zod_1.z.array(zod_1.z.record(zod_1.z.any())).min(1).max(500),
    options: zod_1.z
        .object({
        defaultType: zod_1.z.enum(["payable", "receivable"]).optional(),
        defaultMethod: zod_1.z.string().optional(),
    })
        .optional(),
});
/**
 * Tenta normalizar uma linha genérica em algo que o módulo de contas entende.
 * Se não conseguir, lança um erro com mensagem amigável.
 */
function normalizeRowToAccount(row, options) {
    const getFirst = (...keys) => {
        for (const k of keys) {
            if (row[k] !== undefined && row[k] !== null && row[k] !== "") {
                return row[k];
            }
        }
        return undefined;
    };
    // descrição
    const rawDescription = getFirst("description", "descrição", "Descrição", "desc", "nome", "detalhe", "history", "historico", "Histórico");
    const description = String(rawDescription ?? "").trim();
    if (!description) {
        throw new Error("Descrição ausente ou vazia.");
    }
    // valor
    const rawAmount = getFirst("amount", "valor", "value", "Valor", "vl", "total");
    if (rawAmount === undefined || rawAmount === null || rawAmount === "") {
        throw new Error("Valor ausente.");
    }
    let amountNum;
    if (typeof rawAmount === "number") {
        amountNum = rawAmount;
    }
    else if (typeof rawAmount === "string") {
        const cleaned = rawAmount.replace(/\./g, "").replace(",", ".");
        amountNum = parseFloat(cleaned);
    }
    else {
        throw new Error("Valor em formato inválido.");
    }
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
        throw new Error("Valor inválido ou não positivo.");
    }
    // tipo
    const rawType = (getFirst("type", "tipo", "kind") ??
        options?.defaultType);
    let type;
    if (!rawType) {
        // fallback pelo sinal (se vier valor negativo)
        type = amountNum < 0 ? "payable" : "receivable";
    }
    else {
        const t = String(rawType).toLowerCase();
        if (["pagar", "pay", "payable", "despesa", "expense"].includes(t)) {
            type = "payable";
        }
        else if (["receber", "receive", "receivable", "receita", "income"].includes(t)) {
            type = "receivable";
        }
        else {
            throw new Error(`Tipo inválido: '${rawType}'. Use 'payable' ou 'receivable'.`);
        }
    }
    // data de vencimento (mantemos como string, o front pode garantir o formato)
    const rawDueDate = getFirst("dueDate", "vencimento", "data_vencimento", "data", "date", "dt_venc");
    const dueDate = String(rawDueDate ?? "").trim();
    if (!dueDate) {
        throw new Error("Data de vencimento ausente.");
    }
    // método / referência / notas
    const method = getFirst("method", "método", "forma_pagamento") ??
        options?.defaultMethod;
    const reference = getFirst("reference", "ref", "documento", "nota", "nfe", "invoice");
    const notes = getFirst("notes", "observações", "obs");
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
exports.importsRouter.post("/accounts/preview", async (req, res, next) => {
    try {
        if (!req.tenant || !req.tenant.info?.id) {
            throw new errors_1.ApiError(400, "Tenant context is required.");
        }
        const tenantId = req.tenant.info.id;
        const parsed = importPayloadSchema.parse(req.body || {});
        const { rows, options } = parsed;
        const valid = [];
        const invalid = [];
        rows.forEach((row, index) => {
            try {
                const normalized = normalizeRowToAccount(row, options);
                valid.push({ ...normalized, rowIndex: index });
            }
            catch (err) {
                const message = err?.message || "Erro desconhecido ao processar linha.";
                // 🔎 Log detalhado por linha inválida (preview)
                logger_1.logger.error("[imports.preview] Falha ao normalizar linha", {
                    tenantId,
                    rowIndex: index,
                    error: message,
                    rowSample: JSON.stringify(row).slice(0, 500),
                    traceId: req.traceId,
                });
                invalid.push({
                    rowIndex: index,
                    error: message,
                });
            }
        });
        await (0, auditService_1.logActionFromRequest)(req, "import.accounts.preview", {
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
    }
    catch (err) {
        next(err);
    }
});
// ============================
// ✅ POST /imports/accounts/commit
// Grava as contas normalizadas em tenants/{tenantId}/accounts
// ============================
exports.importsRouter.post("/accounts/commit", async (req, res, next) => {
    try {
        if (!req.tenant || !req.tenant.info?.id) {
            throw new errors_1.ApiError(400, "Tenant context is required.");
        }
        if (!req.user || !req.user.uid) {
            throw new errors_1.ApiError(401, "Authentication is required.");
        }
        const tenantId = req.tenant.info.id;
        const userEmail = req.user.email ?? "anon";
        const parsed = importPayloadSchema.parse(req.body || {});
        const { rows, options } = parsed;
        const dualValidation = req.tenant.info.features?.dualValidation || false;
        const now = new Date().toISOString();
        const batch = firebase_1.db.batch();
        const accountsCol = firebase_1.db.collection(`tenants/${tenantId}/accounts`);
        let successCount = 0;
        const errors = [];
        rows.forEach((row, index) => {
            try {
                const normalized = normalizeRowToAccount(row, options);
                const docRef = accountsCol.doc();
                const accountDoc = {
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
            }
            catch (err) {
                const message = err?.message || "Erro ao normalizar linha para commit.";
                // 🔎 Log detalhado por linha inválida (commit)
                logger_1.logger.error("[imports.commit] Falha ao normalizar linha", {
                    tenantId,
                    rowIndex: index,
                    error: message,
                    rowSample: JSON.stringify(row).slice(0, 500),
                    traceId: req.traceId,
                });
                errors.push({
                    rowIndex: index,
                    error: message,
                });
            }
        });
        if (successCount === 0) {
            throw new errors_1.ApiError(400, "Nenhuma linha válida para importação. Verifique o arquivo enviado.");
        }
        await batch.commit();
        await (0, auditService_1.logActionFromRequest)(req, "import.accounts.commit", {
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
    }
    catch (err) {
        next(err);
    }
});
exports.router = exports.importsRouter;
