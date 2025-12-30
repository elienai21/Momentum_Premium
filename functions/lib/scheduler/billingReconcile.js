"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.billingReconcile = void 0;
// functions/src/scheduler/billingReconcile.ts
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firebase_1 = require("../services/firebase");
const logger_1 = require("../utils/logger");
const reconcileStripe_1 = require("../billing/reconcileStripe");
// Cron diário às 03:00 UTC (ajusta o horário se quiser)
exports.billingReconcile = (0, scheduler_1.onSchedule)("0 3 * * *", async (event) => {
    logger_1.logger.info("[billingReconcile] Iniciando rotina de reconciliação diária", {
        time: event.scheduleTime,
    });
    const snap = await firebase_1.db.collection("tenants").get();
    const tenants = snap.docs.map((doc) => ({ id: doc.id }));
    logger_1.logger.info("[billingReconcile] Tenants encontrados", {
        count: tenants.length,
    });
    for (const t of tenants) {
        try {
            await (0, reconcileStripe_1.reconcileStripeAndCreditsForTenant)(t.id);
        }
        catch (err) {
            logger_1.logger.error("[billingReconcile] Falha ao reconciliar tenant", {
                tenantId: t.id,
                error: err?.message,
            });
        }
    }
    logger_1.logger.info("[billingReconcile] Rotina concluída", {
        tenantCount: tenants.length,
    });
});
