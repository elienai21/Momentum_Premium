"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsCollector = metricsCollector;
const firebase_1 = require("../services/firebase");
const logger_1 = require("../utils/logger");
/**
 * Registra métricas de latência e status de cada requisição no Firestore.
 */
async function metricsCollector(req, res, next) {
    const start = Date.now();
    res.on("finish", async () => {
        const latency = Date.now() - start;
        const entry = {
            route: req.originalUrl,
            method: req.method,
            latencyMs: latency,
            statusCode: res.statusCode,
            tenantId: req?.tenant?.info?.id ?? "anonymous",
            traceId: req?.traceId,
            timestamp: new Date().toISOString(),
        };
        try {
            await firebase_1.db.collection("system_metrics").add(entry);
        }
        catch (err) {
            logger_1.logger.error("Failed to write metric", { error: err?.message, entry });
        }
    });
    next();
}
