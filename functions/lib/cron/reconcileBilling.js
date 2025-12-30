"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reconcileAllTenantsBilling = reconcileAllTenantsBilling;
const firebase_1 = require("../services/firebase");
const logger_1 = require("../utils/logger");
const reconcileStripe_1 = require("../billing/reconcileStripe");
async function reconcileAllTenantsBilling() {
    logger_1.logger.info("Starting nightly billing reconcile job");
    const snap = await firebase_1.db.collection("tenants").get();
    const tenants = snap.docs.map((doc) => ({ id: doc.id }));
    for (const t of tenants) {
        try {
            await (0, reconcileStripe_1.reconcileStripeAndCreditsForTenant)(t.id);
        }
        catch (err) {
            logger_1.logger.error("Failed to reconcile tenant billing", {
                tenantId: t.id,
                error: err?.message,
            });
        }
    }
    logger_1.logger.info("Finished nightly billing reconcile job", { tenantCount: tenants.length });
}
