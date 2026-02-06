"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.outboundWebhook = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const firebase_1 = require("../services/firebase");
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../utils/logger");
const tenants_1 = require("../core/tenants");
const OUTBOUND_TIMEOUT = 5000;
exports.outboundWebhook = (0, firestore_1.onDocumentCreated)({
    document: "tenants/{tenantId}/pulse/{docId}",
    region: "southamerica-east1",
    maxInstances: 2,
}, async (event) => {
    const snap = event.data;
    if (!snap)
        return;
    const tenantId = event.params.tenantId;
    const docId = event.params.docId;
    const data = snap.data();
    try {
        // 1. Check if tenant has webhook configured
        // We read settings/integrations doc.
        // Assuming structure tenants/{tenantId}/settings/integrations
        const settingsSnap = await firebase_1.db.doc(`tenants/${tenantId}/settings/integrations`).get();
        if (!settingsSnap.exists)
            return;
        const webhookUrl = settingsSnap.data()?.webhookUrl;
        if (!webhookUrl)
            return;
        // 2. Load basic tenant info for headers/context
        const tenant = await (0, tenants_1.loadTenant)(tenantId);
        // 3. Send Payload
        const payload = {
            event: "pulse.created",
            tenantId,
            docId,
            data,
            timestamp: new Date().toISOString(),
        };
        await axios_1.default.post(webhookUrl, payload, {
            headers: {
                "X-Momentum-Signature": "sha256=TODO", // Add signature logic if needed
                "X-Tenant-ID": tenantId,
                "User-Agent": "Momentum-Webhook-Bot/1.0"
            },
            timeout: OUTBOUND_TIMEOUT
        });
        logger_1.logger.info(`Webhook sent successfully to ${webhookUrl}`, { tenantId, docId });
    }
    catch (err) {
        logger_1.logger.error("Failed to send outbound webhook", {
            tenantId,
            docId,
            error: err.message
        });
        // We don't throw to avoid infinite retries on external failures unless we want that
    }
});
