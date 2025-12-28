"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processTenantHealth = void 0;
const logger_1 = require("../utils/logger");
const healthScore_1 = require("./healthScore");
/**
 * Processes the health score for a single tenant.
 * Intended to be called by a Pub/Sub worker.
 * @param tenantId The ID of the tenant.
 * @param ownerUid The UID of the tenant owner.
 */
const processTenantHealth = async (tenantId, ownerUid) => {
    logger_1.logger.info("AI Brain Worker: Starting health score calculation", { tenantId });
    try {
        if (tenantId && ownerUid) {
            const result = await (0, healthScore_1.calculateHealthScore)(tenantId, ownerUid);
            logger_1.logger.info("Health score updated for tenant", { tenantId, score: result.score });
        }
        else {
            logger_1.logger.warn(`Skipping health score due to missing tenantId or ownerUid.`);
        }
    }
    catch (error) {
        logger_1.logger.error("AI Brain Worker: Health score calculation failed", { tenantId, error });
    }
};
exports.processTenantHealth = processTenantHealth;
