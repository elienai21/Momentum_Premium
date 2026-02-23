import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { db } from "../services/firebase";
import axios from "axios";
import { logger } from "../utils/logger";
import * as crypto from "crypto";

const OUTBOUND_TIMEOUT = 5000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

/**
 * Computes HMAC-SHA256 signature for webhook payload verification.
 * Recipients should recompute the signature using the shared secret
 * and compare it to the X-Momentum-Signature header.
 */
function computeSignature(payload: string, secret: string): string {
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(payload);
    return `sha256=${hmac.digest("hex")}`;
}

/**
 * Simple delay helper for retry backoff.
 */
function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

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
            const settingsSnap = await db.doc(`tenants/${tenantId}/settings/integrations`).get();

            if (!settingsSnap.exists) return;

            const webhookUrl = settingsSnap.data()?.webhookUrl;
            if (!webhookUrl) return;

            // 2. Build payload
            const payload = {
                event: "pulse.created",
                tenantId,
                docId,
                data,
                timestamp: new Date().toISOString(),
            };

            // 3. Compute HMAC signature
            const secret = process.env.WEBHOOK_SECRET || "";
            const payloadJson = JSON.stringify(payload);

            if (!secret) {
                logger.warn("WEBHOOK_SECRET not configured, skipping webhook delivery", { tenantId, docId });
                return;
            }

            const signature = computeSignature(payloadJson, secret);

            // 4. Send with retry logic
            let lastError: Error | null = null;
            for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
                try {
                    if (attempt > 0) {
                        await delay(RETRY_DELAY_MS * attempt);
                        logger.info(`Webhook retry attempt ${attempt}/${MAX_RETRIES}`, { tenantId, docId });
                    }

                    await axios.post(webhookUrl, payload, {
                        headers: {
                            "Content-Type": "application/json",
                            "X-Momentum-Signature": signature,
                            "X-Momentum-Event": "pulse.created",
                            "X-Tenant-ID": tenantId,
                            "User-Agent": "Momentum-Webhook-Bot/1.0",
                        },
                        timeout: OUTBOUND_TIMEOUT,
                    });

                    logger.info("Webhook delivered successfully", {
                        tenantId,
                        docId,
                        url: webhookUrl,
                        attempts: attempt + 1,
                    });
                    return; // Success — exit early

                } catch (retryErr) {
                    lastError = retryErr instanceof Error ? retryErr : new Error(String(retryErr));
                }
            }

            // All retries exhausted
            logger.error("Webhook delivery failed after all retries", {
                tenantId,
                docId,
                url: webhookUrl,
                error: lastError?.message ?? "Unknown error",
                maxRetries: MAX_RETRIES,
            });

        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            logger.error("Unexpected error in outbound webhook trigger", {
                tenantId,
                docId,
                error: message,
            });
        }
    }
);
