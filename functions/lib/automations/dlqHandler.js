"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleFailedInsight = void 0;
const firebase_1 = require("../services/firebase");
const logger_1 = require("../utils/logger");
const DLQ_COLLECTION = "queues/insights_requests_dlq";
/**
 * Moves a failed insights request to the Dead-Letter Queue for later inspection.
 * @param error The error that caused the failure.
 * @param requestData The original data from the queued message.
 */
const handleFailedInsight = async (error, requestData) => {
    try {
        await firebase_1.db.collection(DLQ_COLLECTION).add({
            originalRequest: requestData,
            error: {
                message: error.message || "Unknown error",
                stack: error.stack || null,
            },
            failedAt: new Date().toISOString(),
        });
        logger_1.logger.warn("Moved failed insight request to DLQ", { traceId: requestData.traceId });
    }
    catch (dlqError) {
        logger_1.logger.error("!!! CRITICAL: Failed to write to DLQ", {
            originalTraceId: requestData.traceId,
            dlqError
        });
    }
};
exports.handleFailedInsight = handleFailedInsight;
