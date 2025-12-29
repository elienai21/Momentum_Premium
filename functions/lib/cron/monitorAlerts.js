"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.monitorAlerts = void 0;
// src/cron/monitorAlerts.ts
const firebase_1 = require("../services/firebase");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const logger_1 = require("../utils/logger");
exports.monitorAlerts = (0, scheduler_1.onSchedule)({
    schedule: "every 30 minutes",
    timeZone: "America/Sao_Paulo",
    region: "southamerica-east1", // ✅
    timeoutSeconds: 120,
    memory: "256MiB",
}, async (event) => {
    const recent = Date.now() - 1000 * 60 * 30;
    const snapshot = await firebase_1.db
        .collection("system_metrics")
        .where("timestamp", ">=", new Date(recent).toISOString())
        .get();
    const slowRequests = snapshot.docs.filter((d) => (d.data().latencyMs ?? 0) > 1500);
    if (slowRequests.length > 0) {
        await firebase_1.db.collection("system_alerts").add({
            type: "performance",
            message: `${slowRequests.length} slow API calls detected.`,
            createdAt: new Date().toISOString(),
        });
        logger_1.logger.warn("Performance alert generated", {
            count: slowRequests.length,
        });
    }
});
