"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiError = void 0;
exports.notFoundHandler = notFoundHandler;
exports.errorHandler = errorHandler;
const logger_1 = require("../utils/logger");
// Classe padrão de erro de API
class ApiError extends Error {
    status;
    code;
    extras;
    constructor(status, message, code, extras) {
        super(message);
        this.status = status;
        this.code = code;
        this.extras = extras;
    }
}
exports.ApiError = ApiError;
// 404 — rota não encontrada
function notFoundHandler(_req, res) {
    res.status(404).json({ ok: false, error: "Not Found" });
}
// Tratamento global de erros
function errorHandler(err, req, res, _next) {
    const status = err?.status ?? 500;
    // Corrigido: remove req como 3º argumento do logger
    logger_1.logger.error("Unhandled error", {
        error: err?.stack ?? err?.message,
        code: err?.code,
        traceId: req?.traceId,
        path: req.path,
    });
    res.status(status).json({
        ok: false,
        error: err?.message ?? "Internal Error",
        code: err?.code ?? "INTERNAL",
        traceId: req?.traceId,
    });
}
