"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadTenant = loadTenant;
exports.getTenantByDomain = getTenantByDomain;
const firebase_1 = require("../services/firebase");
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
/**
 * Loads a tenant's configuration from Firestore by its ID.
 * @param tenantId The unique ID of the tenant.
 * @returns A promise that resolves to the tenant's information.
 */
async function loadTenant(tenantId) {
    const snap = await firebase_1.db.collection('tenants').doc(tenantId).get();
    if (!snap.exists) {
        throw new errors_1.ApiError(404, `Tenant with ID "${tenantId}" not found.`);
    }
    return { id: snap.id, ...snap.data() };
}
/**
 * Loads a tenant's configuration from Firestore by their custom domain.
 * @param domain The custom domain associated with the tenant.
 * @returns A promise that resolves to the tenant's information or null if not found.
 */
async function getTenantByDomain(domain) {
    logger_1.logger.info("Attempting to find tenant by domain", { domain });
    const snap = await firebase_1.db.collection('tenants')
        .where('domain', '==', domain)
        .limit(1)
        .get();
    if (snap.empty) {
        logger_1.logger.warn("No tenant found for domain", { domain });
        return null;
    }
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() };
}
