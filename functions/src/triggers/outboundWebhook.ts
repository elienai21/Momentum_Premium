import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { db } from "../services/firebase";
import axios from "axios";
import { logger } from "../utils/logger";
import * as crypto from "crypto";

const OUTBOUND_TIMEOUT = 5000;

export const outboundWebhook = onDocumentCreated(
    {
        document: "tenants/{tenantId}/pulse/{docId}",
        region: "southamerica-east1",
        maxInstances: 2,
    },
    async (event) => {
        const snap = event.data;
        if (!snap) return;

        const tenantId = event.params.tenantId;
        const docId = event.params.docId;
        const data = snap.data();

        try {
            // 1. Check if tenant has webhook configured
            // We read settings/integrations doc.
            // Assuming structure tenants/{tenantId}/settings/integrations
            const settingsSnap = await db.doc(`tenants/${tenantId}/settings/integrations`).get();

            if (!settingsSnap.exists) return;

            const webhookUrl = settingsSnap.data()?.webhookUrl;
            if (!webhookUrl) return;

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
                logger.warn("WEBHOOK_SECRET not configured, skipping webhook", { tenantId, docId });
                return;
            }

            const hmac = crypto.createHmac("sha256", secret);
            hmac.update(JSON.stringify(payload));
            const signature = `sha256=${hmac.digest("hex")}`;

            await axios.post(webhookUrl, payload, {
                headers: {
                    "X-Momentum-Signature": signature,
                    "X-Tenant-ID": tenantId,
                    "User-Agent": "Momentum-Webhook-Bot/1.0"
                },
                timeout: OUTBOUND_TIMEOUT
            });

            logger.info(`Webhook sent successfully to ${webhookUrl}`, { tenantId, docId });

        } catch (err: any) {
            logger.error("Failed to send outbound webhook", {
                tenantId,
                docId,
                error: err.message
            });
            // We don't throw to avoid infinite retries on external failures unless we want that
        }
    }
);
