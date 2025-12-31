"use strict";
// ============================
// Momentum Logger — Cloud & Local (v7.9 Final)
// ============================
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.logError = logError;
function normalizeMeta(metaOrTrace, extraMeta, req) {
    const meta = typeof metaOrTrace === "string"
        ? { traceId: metaOrTrace, ...extraMeta }
        : { ...metaOrTrace, ...extraMeta };
    const traceId = meta.traceId ?? req?.traceId;
    const cleanedMeta = { ...meta };
    delete cleanedMeta.traceId;
    const base = {
        path: req?.path,
        user: req?.user?.uid,
        tenant: req?.tenant?.info?.id,
        ...cleanedMeta,
    };
    if (traceId !== undefined) {
        base.traceId = traceId;
    }
    return base;
}
exports.logger = {
    info: (message, metaOrTrace = {}, reqOrMeta, maybeReq) => {
        const req = reqOrMeta && "method" in reqOrMeta ? reqOrMeta : maybeReq;
        const meta = reqOrMeta && !req ? reqOrMeta : {};
        const base = normalizeMeta(metaOrTrace, meta, req);
        console.log(JSON.stringify({ level: "info", message, ...base }));
    },
    warn: (message, meta = {}, req) => {
        const base = normalizeMeta(meta, {}, req);
        console.warn(JSON.stringify({ level: "warn", message, ...base }));
    },
    error: (message, meta = {}, req) => {
        const base = normalizeMeta(meta, {}, req);
        console.error(JSON.stringify({ level: "error", message, ...base }));
    },
};
async function logError(error, severity = "LOW", meta = {}, traceId) {
    const message = typeof error === "string" ? error : error.message;
    const payload = normalizeMeta({ severity, error: message, traceId, ...meta }, {}, undefined);
    console.error(JSON.stringify({ level: "error", message, ...payload }));
    const shouldAlert = severity === "HIGH" || severity === "CRITICAL";
    const webhookUrl = process.env.ERROR_WEBHOOK_URL;
    if (!shouldAlert || !webhookUrl)
        return;
    try {
        await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                service: "Momentum",
                error: message,
                traceId: payload.traceId,
            }),
        });
    }
    catch (err) {
        console.error(JSON.stringify({
            level: "error",
            message: "Failed to post error webhook",
            severity,
            traceId: payload.traceId,
            error: err?.message,
        }));
    }
}
