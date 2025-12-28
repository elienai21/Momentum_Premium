import { db } from "src/services/firebase";

import { logger } from "../utils/logger";
import { calculateHealthScore } from "./healthScore";

/**
 * Processes the health score for a single tenant.
 * Intended to be called by a Pub/Sub worker.
 * @param tenantId The ID of the tenant.
 * @param ownerUid The UID of the tenant owner.
 */
export const processTenantHealth = async (tenantId: string, ownerUid: string): Promise<void> => {
    logger.info("AI Brain Worker: Starting health score calculation", { tenantId });
    
    try {
        if (tenantId && ownerUid) {
            const result = await calculateHealthScore(tenantId, ownerUid);
            logger.info("Health score updated for tenant", { tenantId, score: result.score });
        } else {
            logger.warn(`Skipping health score due to missing tenantId or ownerUid.`);
        }
    } catch (error) {
        logger.error("AI Brain Worker: Health score calculation failed", { tenantId, error });
    }
};



