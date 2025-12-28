"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachTraceId = attachTraceId;
// ============================
// 🧭 trace.ts — Request Tracing Middleware (v7.9-FIX)
// ============================
const uuid_1 = require("uuid");
/**
 * Adiciona um identificador único (traceId) a cada requisição
 * e inicializa o contexto de execução.
 */
function attachTraceId(req, _res, next) {
    const traceId = (0, uuid_1.v4)();
    // Evita erro de tipagem estendendo dinamicamente a request
    req.traceId = traceId;
    req.context = {
        traceId,
        startedAt: Date.now(),
    };
    next();
}
