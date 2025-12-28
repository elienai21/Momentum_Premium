"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onInsightsRequest = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const insights_1 = require("./insights");
const logger_1 = require("../utils/logger");
const dlqHandler_1 = require("../automations/dlqHandler");
const INSIGHTS_QUEUE_PATH = "queues/insights_requests/{requestId}";
exports.onInsightsRequest = (0, firestore_1.onDocumentCreated)(INSIGHTS_QUEUE_PATH, async (event) => {
    const snap = event.data;
    if (!snap) {
        logger_1.logger.warn("onInsightsRequest trigger fired with no data.");
        return;
    }
    const requestData = snap.data();
    const { userId, sheetId, dashboard, traceId, tenant } = requestData;
    if (!userId || !sheetId || !dashboard || !tenant) {
        logger_1.logger.error("Invalid insights request in queue (missing data or tenant info), moving to DLQ", { docId: snap.id, traceId });
        await (0, dlqHandler_1.handleFailedInsight)({ message: "Invalid request data or missing tenant info" }, requestData);
        await snap.ref.delete();
        return;
    }
    try {
        logger_1.logger.info("Processing insights request from queue", { userId, sheetId, traceId, tenantId: tenant.id });
        await (0, insights_1.getAiInsights)(userId, "auto-refresh");
        await snap.ref.delete();
        logger_1.logger.info("Successfully processed insights request", { docId: snap.id, traceId });
    }
    catch (error) {
        logger_1.logger.error("Failed to process insights request, moving to DLQ", { error, docId: snap.id, traceId });
        await (0, dlqHandler_1.handleFailedInsight)(error, requestData);
        await snap.ref.delete();
    }
});
