import { db } from "src/services/firebase";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { getAiInsights } from "./insights";
import { logger } from "../utils/logger";
import { DashboardData, TenantInfo } from "../types";
import { handleFailedInsight } from "../automations/dlqHandler";

const INSIGHTS_QUEUE_PATH = "queues/insights_requests/{requestId}";

export const onInsightsRequest = onDocumentCreated(INSIGHTS_QUEUE_PATH, async (event) => {
    const snap = event.data;
    if (!snap) {
        logger.warn("onInsightsRequest trigger fired with no data.");
        return;
    }

    const requestData = snap.data();
    const { userId, sheetId, dashboard, traceId, tenant } = requestData;

    if (!userId || !sheetId || !dashboard || !tenant) {
        logger.error("Invalid insights request in queue (missing data or tenant info), moving to DLQ", { docId: snap.id, traceId });
        await handleFailedInsight({ message: "Invalid request data or missing tenant info" }, requestData);
        await snap.ref.delete();
        return;
    }

    try {
        logger.info("Processing insights request from queue", { userId, sheetId, traceId, tenantId: tenant.id });
        await getAiInsights(userId, "auto-refresh");
        await snap.ref.delete();
        logger.info("Successfully processed insights request", { docId: snap.id, traceId });
    } catch (error) {
        logger.error("Failed to process insights request, moving to DLQ", { error, docId: snap.id, traceId });
        await handleFailedInsight(error, requestData);
        await snap.ref.delete();
    }
});


