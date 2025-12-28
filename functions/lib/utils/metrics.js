"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordMetric = recordMetric;
exports.recordLatency = recordLatency;
const firebase_1 = require("../services/firebase");
// utils/metrics.ts
const logger_1 = require("./logger");
/**
 * Registra uma métrica operacional ou de uso.
 * @param metric Nome da métrica (ex: 'api_latency', 'ai_usage')
 * @param data   Dados adicionais (ex: rota, tempo, tenant, status)
 */
async function recordMetric(metric, data) {
    try {
        const entry = {
            metric,
            ...data,
            timestamp: new Date().toISOString(),
        };
        await firebase_1.db.collection("system_metrics").add(entry);
    }
    catch (err) {
        logger_1.logger.error("Failed to write metric", { metric, err });
    }
}
/**
 * Calcula média simples de latência de uma rota.
 */
async function recordLatency(route, latencyMs, tenantId) {
    return recordMetric("api_latency", { route, latencyMs, tenantId });
}
