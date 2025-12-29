"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dedupRouter = void 0;
// functions/src/routes/dedup.ts
const express_1 = require("express");
const firestore_1 = require("firebase-admin/firestore");
const requireAuth_1 = require("../middleware/requireAuth");
const withTenant_1 = require("../middleware/withTenant");
const logger_1 = require("../utils/logger");
const dedupRouter = (0, express_1.Router)();
exports.dedupRouter = dedupRouter;
// Todas as rotas exigem usuário autenticado + tenant resolvido
dedupRouter.use(requireAuth_1.requireAuth, withTenant_1.withTenant);
/**
 * Calcula uma "impressão digital" (fingerprint) da transação
 * para identificar duplicadas.
 *
 * Ajuste os campos se sua coleção de transactions tiver nomes diferentes.
 */
function buildTxnFingerprint(data) {
    const date = data.dateKey ||
        (typeof data.date === "string"
            ? data.date.slice(0, 10)
            : "") ||
        "";
    const amount = Number(data.amount ?? 0);
    const type = data.type || "debit";
    const accountId = data.accountId || "";
    const desc = (data.description || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
    return [
        date || "no-date",
        amount.toFixed(2),
        type,
        accountId || "no-account",
        desc || "no-desc",
    ].join("|");
}
/**
 * GET /apiV2/dedup/transactions/preview
 *
 * Retorna grupos de transações que parecem duplicadas,
 * baseado na fingerprint.
 *
 * Obs: para não explodir, limitamos o scan em até MAX_DOCS docs.
 */
dedupRouter.get("/transactions/preview", async (req, res) => {
    try {
        const tenantId = req.tenant?.info?.id;
        if (!tenantId) {
            return res.status(400).json({ error: "Tenant não encontrado." });
        }
        const db = (0, firestore_1.getFirestore)();
        const MAX_DOCS = 3000;
        const snap = await db
            .collection(`tenants/${tenantId}/transactions`)
            .limit(MAX_DOCS)
            .get();
        const groupsMap = new Map();
        snap.forEach((doc) => {
            const data = doc.data();
            const fingerprint = buildTxnFingerprint(data);
            const dateRaw = data.dateKey ||
                (typeof data.date === "string" ? data.date : null);
            const amount = Number(data.amount ?? 0);
            const normalized = {
                id: doc.id,
                date: dateRaw,
                description: data.description || "",
                amount,
                type: data.type || "debit",
                accountId: data.accountId || undefined,
                createdAt: data.createdAt ||
                    (data.createdAt instanceof Date
                        ? data.createdAt.toISOString()
                        : undefined),
            };
            const existing = groupsMap.get(fingerprint);
            if (existing) {
                existing.docs.push(normalized);
            }
            else {
                groupsMap.set(fingerprint, {
                    fingerprint,
                    docs: [normalized],
                });
            }
        });
        // Mantém apenas fingerprints com mais de 1 transação (duplicadas)
        const groups = Array.from(groupsMap.values())
            .filter((g) => g.docs.length > 1)
            .map((g) => ({
            fingerprint: g.fingerprint,
            count: g.docs.length,
            sample: g.docs[0],
            docs: g.docs,
            ids: g.docs.map((d) => d.id),
        }));
        logger_1.logger.info("Dedup preview computed", {
            tenantId,
            groups: groups.length,
        });
        return res.status(200).json({
            status: "ok",
            totalScanned: snap.size,
            groups,
        });
    }
    catch (err) {
        logger_1.logger.error("Error in /dedup/transactions/preview", {
            error: err?.message,
            stack: err?.stack,
        });
        return res.status(500).json({
            error: "Erro ao analisar duplicidades de transações.",
        });
    }
});
/**
 * POST /apiV2/dedup/transactions/cleanup
 *
 * Body: { deleteIds: string[] }
 *
 * Deleta em batch as transações informadas (dentro do tenant atual).
 * A ideia é: o front mostra os grupos, o usuário escolhe quais IDs deletar,
 * e manda para este endpoint.
 */
dedupRouter.post("/transactions/cleanup", async (req, res) => {
    try {
        const tenantId = req.tenant?.info?.id;
        if (!tenantId) {
            return res.status(400).json({ error: "Tenant não encontrado." });
        }
        const { deleteIds } = (req.body || {});
        if (!Array.isArray(deleteIds) || deleteIds.length === 0) {
            return res.status(400).json({
                error: "Campo 'deleteIds' deve ser um array de IDs de transações a serem removidas.",
            });
        }
        const db = (0, firestore_1.getFirestore)();
        const batch = db.batch();
        deleteIds.forEach((id) => {
            const ref = db.doc(`tenants/${tenantId}/transactions/${id}`);
            batch.delete(ref);
        });
        await batch.commit();
        logger_1.logger.info("Dedup cleanup executed", {
            tenantId,
            deleted: deleteIds.length,
        });
        return res.status(200).json({
            status: "ok",
            deleted: deleteIds.length,
        });
    }
    catch (err) {
        logger_1.logger.error("Error in /dedup/transactions/cleanup", {
            error: err?.message,
            stack: err?.stack,
        });
        return res.status(500).json({
            error: "Erro ao remover transações duplicadas.",
        });
    }
});
