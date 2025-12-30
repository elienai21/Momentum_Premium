"use strict";
// functions/src/modules/audit/auditService.ts
// Novo serviço de auditoria unificado (v1)
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAction = logAction;
exports.logActionFromRequest = logActionFromRequest;
exports.listAuditLogs = listAuditLogs;
const firebase_1 = require("src/services/firebase");
const logger_1 = require("../../utils/logger");
const errors_1 = require("../../utils/errors");
require("../../types");
const COLLECTION = "audit_logs";
/**
 * 🧾 Grava uma ação de auditoria com dados explícitos.
 */
async function logAction(entry) {
    const createdAt = new Date().toISOString();
    const doc = {
        ...entry,
        createdAt,
    };
    await firebase_1.db.collection(COLLECTION).add(doc);
    logger_1.logger.info("Audit log created", {
        tenantId: entry.tenantId,
        userId: entry.userId,
        type: entry.type,
    });
}
/**
 * 🧾 Helper para gravar auditoria a partir de um Request.
 * Usa req.user / req.tenant e permite passar um payload resumido.
 */
async function logActionFromRequest(req, type, payload, origin) {
    try {
        const tenantId = req.tenant?.id ||
            req.tenant?.info?.id ||
            req.tenantId ||
            null;
        const userId = req.user?.uid ||
            req.user?.email ||
            "system";
        const ip = req.headers["x-forwarded-for"] ||
            req.socket?.remoteAddress ||
            null;
        const userAgent = req.headers["user-agent"] || null;
        // Evita payloads gigantes
        let safePayload = undefined;
        if (payload) {
            try {
                const str = JSON.stringify(payload);
                if (str.length > 4000) {
                    safePayload = { truncated: true };
                }
                else {
                    safePayload = payload;
                }
            }
            catch {
                safePayload = { invalid: true };
            }
        }
        await logAction({
            tenantId,
            userId,
            type,
            origin: origin || req.path,
            ip,
            userAgent,
            payload: safePayload,
        });
    }
    catch (err) {
        logger_1.logger.error("Failed to log audit from request", {
            error: err?.message,
            type,
            path: req.path,
        });
    }
}
/**
 * 🔍 Lista logs de auditoria de um tenant com filtros básicos.
 */
async function listAuditLogs(tenantId, opts = {}) {
    if (!tenantId) {
        throw new errors_1.ApiError(400, "Missing tenantId for listAuditLogs");
    }
    let query = firebase_1.db
        .collection(COLLECTION)
        .where("tenantId", "==", tenantId);
    if (opts.userId) {
        query = query.where("userId", "==", opts.userId);
    }
    if (opts.type) {
        query = query.where("type", "==", opts.type);
    }
    if (opts.from) {
        query = query.where("createdAt", ">=", opts.from.toISOString());
    }
    if (opts.to) {
        query = query.where("createdAt", "<=", opts.to.toISOString());
    }
    const limit = opts.limit && opts.limit > 0 && opts.limit <= 500 ? opts.limit : 100;
    query = query.orderBy("createdAt", "desc").limit(limit);
    const snap = await query.get();
    const items = snap.docs.map((d) => {
        const data = d.data();
        return {
            id: d.id,
            ...data,
        };
    });
    logger_1.logger.info("Audit logs listed", {
        tenantId,
        count: items.length,
    });
    return items;
}
