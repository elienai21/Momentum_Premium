import { db } from "src/services/firebase";

import { logger } from "../utils/logger";

const DLQ_COLLECTION = "queues/insights_requests_dlq";

/**
 * Moves a failed insights request to the Dead-Letter Queue for later inspection.
 * @param error The error that caused the failure.
 * @param requestData The original data from the queued message.
 */
export const handleFailedInsight = async (error: any, requestData: any): Promise<void> => {
    try {
        await db.collection(DLQ_COLLECTION).add({
            originalRequest: requestData,
            error: {
                message: error.message || "Unknown error",
                stack: error.stack || null,
            },
            failedAt: new Date().toISOString(),
        });
        logger.warn("Moved failed insight request to DLQ", { traceId: requestData.traceId });
    } catch (dlqError) {
        logger.error("!!! CRITICAL: Failed to write to DLQ", { 
            originalTraceId: requestData.traceId,
            dlqError 
        });
    }
};



