"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const logger_1 = require("../utils/logger");
const metrics_1 = require("../utils/metrics");
const errors_1 = require("../utils/errors");
/**
 * Middleware global para tratamento de erros e logging estruturado.
 * Compatível com TypeScript 5 e Firebase Functions v5.
 */
function errorHandler(err, req, res, _next) {
    // ✅ Garante statusCode, mesmo se err não for ApiError
    const status = err instanceof errors_1.ApiError
        ? err.statusCode || err.status || 500
        : 500;
    // ✅ Logging consistente (sem 3º parâmetro)
    logger_1.logger.error("Unhandled error", {
        traceId: req?.traceId,
        tenantId: req?.user?.tenantId,
        path: req.path,
        message: err?.message ?? "Unknown error",
        stack: err?.stack,
    });
    // ✅ Registro de métricas
    (0, metrics_1.recordMetric)("error_event", {
        route: req.path,
        tenantId: req?.user?.tenantId,
        code: status,
        message: err?.message ?? "Unknown error",
    });
    // ✅ Resposta JSON estruturada
    res.status(status).json({
        ok: false,
        error: err?.message ?? "Internal server error",
        traceId: req?.traceId,
    });
}
