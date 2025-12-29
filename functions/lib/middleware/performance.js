"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.perfLogger = perfLogger;
const logger_1 = require("../utils/logger");
/**
 * Middleware para medir e registrar o tempo de execução de cada requisição.
 */
function perfLogger(req, res, next) {
    const start = Date.now();
    res.on("finish", () => {
        const duration = Date.now() - start;
        // ✅ Corrigido: remove o terceiro argumento “req”
        logger_1.logger.info(`[Perf] ${req.method} ${req.originalUrl} - ${res.statusCode} [${duration}ms]`, {
            traceId: req?.traceId,
            tenant: req?.tenant?.info?.id,
            user: req?.user?.email ?? "anonymous",
            duration,
        });
    });
    next();
}
