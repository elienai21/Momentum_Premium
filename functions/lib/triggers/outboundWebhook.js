"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.outboundWebhook = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const firebase_1 = require("../services/firebase");
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../utils/logger");
const crypto = __importStar(require("crypto"));
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
        // 2. Load basic tenant info for headers/context (skipped as we only need ID)
        // const tenant = await loadTenant(tenantId);
        // 3. Send Payload
        const payload = {
            event: "pulse.created",
            tenantId,
            docId,
            data,
            timestamp: new Date().toISOString(),
        };
        // Calculate signature - require WEBHOOK_SECRET to be configured
        const secret = process.env.WEBHOOK_SECRET;
        if (!secret) {
            logger_1.logger.warn("WEBHOOK_SECRET not configured, skipping webhook", { tenantId, docId });
            return;
        }
        const hmac = crypto.createHmac("sha256", secret);
        hmac.update(JSON.stringify(payload));
        const signature = `sha256=${hmac.digest("hex")}`;
        await axios_1.default.post(webhookUrl, payload, {
            headers: {
                "X-Momentum-Signature": signature,
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
