"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachTraceContext = attachTraceContext;
const crypto_1 = require("crypto");
/**
 * Middleware para criar um contexto de auditoria por requisição.
 * Fornece traceId, tenantId, região e idioma para todos os logs.
 */
function attachTraceContext(req, _res, next) {
    const traceId = req.get("x-trace-id") || (0, crypto_1.randomUUID)();
    req.traceId = traceId;
    const tenantId = req?.tenant?.info?.id ||
        req.get("x-tenant-id") ||
        req?.user?.tenantId ||
        "unknown";
    req.context = {
        traceId,
        tenantId,
        locale: req.get("accept-language")?.split(",")[0] || "en-US",
        region: req.get("cf-ipcountry") || "unknown",
        startedAt: Date.now(),
    };
    next();
}
