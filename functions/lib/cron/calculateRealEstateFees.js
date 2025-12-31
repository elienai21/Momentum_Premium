"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateRealEstateFees = void 0;
// functions/src/cron/calculateRealEstateFees.ts
/**
 * Scheduled function that runs daily to calculate Real Estate management fees
 * for tenants with hybridBilling enabled.
 *
 * Calculates:
 * - Active units count
 * - Active owners count
 * - Excess beyond included quota (e.g. 10 free)
 * - Logs usage to billing_usage collection for future invoicing
 */
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firebase_1 = require("../services/firebase");
const INCLUDED_UNITS = 10; // Franquia inclusa
const UNIT_FEE = 2; // R$ por unidade excedente
const OWNER_FEE = 10; // R$ por proprietário
exports.calculateRealEstateFees = (0, scheduler_1.onSchedule)({
    schedule: "0 3 * * *", // Daily at 3 AM
    timeZone: "America/Sao_Paulo",
    region: "southamerica-east1",
    memory: "256MiB",
}, async () => {
    console.log("[CRON] Starting Real Estate fees calculation...");
    const tenantsSnap = await firebase_1.db
        .collection("tenants")
        .where("features.realEstate", "==", true)
        .get();
    const results = [];
    for (const tenantDoc of tenantsSnap.docs) {
        const tenantId = tenantDoc.id;
        const tenantData = tenantDoc.data();
        // Only process tenants with hybridBilling flag
        if (!tenantData.billing?.hybridBilling) {
            continue;
        }
        try {
            // Count active units
            const unitsSnap = await firebase_1.db
                .collection("tenants")
                .doc(tenantId)
                .collection("realEstate_units")
                .where("active", "==", true)
                .get();
            // Count active owners
            const ownersSnap = await firebase_1.db
                .collection("tenants")
                .doc(tenantId)
                .collection("realEstate_owners")
                .get();
            const activeUnits = unitsSnap.size;
            const activeOwners = ownersSnap.size;
            const excessUnits = Math.max(0, activeUnits - INCLUDED_UNITS);
            const estimatedFee = excessUnits * UNIT_FEE + activeOwners * OWNER_FEE;
            // Log usage for billing
            await firebase_1.db
                .collection("tenants")
                .doc(tenantId)
                .collection("billing_usage")
                .add({
                type: "real_estate_management",
                period: new Date().toISOString().slice(0, 10),
                activeUnits,
                activeOwners,
                excessUnits,
                includedQuota: INCLUDED_UNITS,
                unitFee: UNIT_FEE,
                ownerFee: OWNER_FEE,
                estimatedFee,
                createdAt: new Date().toISOString(),
            });
            results.push({
                tenantId,
                activeUnits,
                activeOwners,
                excessUnits,
                estimatedFee,
            });
            console.log(`[CRON] Tenant ${tenantId}: ${activeUnits} units, ${activeOwners} owners, fee: R$ ${estimatedFee}`);
        }
        catch (err) {
            console.error(`[CRON] Error processing tenant ${tenantId}:`, err);
        }
    }
    console.log(`[CRON] Real Estate fees calculation complete. Processed ${results.length} tenants.`);
});
