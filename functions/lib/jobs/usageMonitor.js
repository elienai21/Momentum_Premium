"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usageMonitor = void 0;
// src/jobs/usageMonitor.ts
const firebase_1 = require("src/services/firebase");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const logger_1 = require("../utils/logger");
/**
 * Verifica tenants sem atividade recente e cria alerta de inatividade.
 * Agendamento: diariamente 09:00 (Horário de São Paulo)
 */
exports.usageMonitor = (0, scheduler_1.onSchedule)({
    schedule: "0 9 * * *", // 09:00 AM
    timeZone: "America/Sao_Paulo",
    region: "southamerica-east1", // ✅
    timeoutSeconds: 300,
    memory: "256MiB",
}, async (event) => {
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const cutoff = new Date(now - sevenDays).toISOString();
    const tenantsSnap = await firebase_1.db.collection("tenants").get();
    let count = 0;
    for (const t of tenantsSnap.docs) {
        const tid = t.id;
        try {
            const last = await firebase_1.db
                .doc(`tenants/${tid}/analytics/lastActivity`)
                .get();
            const lastAt = (last.exists ? last.data().timestamp : null) || null;
            if (!lastAt || lastAt < cutoff) {
                await firebase_1.db.collection(`tenants/${tid}/alerts`).add({
                    type: "inactivity",
                    level: "info",
                    message: "Detectamos inatividade superior a 7 dias. Deseja uma orientação rápida?",
                    createdAt: new Date().toISOString(),
                    read: false,
                });
                count++;
            }
        }
        catch (e) {
            logger_1.logger.warn("usageMonitor tenant failed", {
                tenantId: tid,
                error: e?.message,
            });
        }
    }
    logger_1.logger.info("usageMonitor finished", { tenantsFlagged: count });
});
