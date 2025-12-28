"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripeWebhook = void 0;
const firebase_1 = require("../services/firebase");
const https_1 = require("firebase-functions/v2/https");
const stripe_1 = __importDefault(require("stripe"));
const params_1 = require("firebase-functions/params");
const logger_1 = require("../utils/logger");
const withTenant_1 = require("../middleware/withTenant");
const STRIPE_SECRET_KEY = (0, params_1.defineSecret)("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = (0, params_1.defineSecret)("STRIPE_WEBHOOK_SECRET");
let stripeClient = null;
function getStripeClient() {
    const key = STRIPE_SECRET_KEY.value();
    if (!stripeClient) {
        stripeClient = new stripe_1.default(key, {
            apiVersion: "2023-10-16",
            typescript: true,
            timeout: 20000,
        });
    }
    return stripeClient;
}
// FIX: Explicitly type request object and infer response object to resolve import error.
exports.stripeWebhook = (0, https_1.onRequest)({ secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET] }, async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;
    if (!sig) {
        logger_1.logger.error("Missing stripe-signature header on webhook");
        res.status(400).send("Missing stripe-signature header");
        return;
    }
    try {
        const stripe = getStripeClient();
        // rawBody é exposto pelo Cloud Functions v2 quando o body parser é configurado corretamente
        event = stripe.webhooks.constructEvent(req.rawBody, sig, STRIPE_WEBHOOK_SECRET.value());
    }
    catch (err) {
        logger_1.logger.error("Invalid Stripe webhook signature:", { error: err });
        res.status(400).send(`Webhook error: ${err.message}`);
        return;
    }
    const eventId = event.id;
    const existing = await firebase_1.db.collection("webhook_events").doc(eventId).get();
    if (existing.exists) {
        logger_1.logger.warn(`Duplicate event ${eventId} ignored.`);
        res.status(200).send({ received: true });
        return;
    }
    await firebase_1.db
        .collection("webhook_events")
        .doc(eventId)
        .set({ id: eventId, type: event.type, created: new Date().toISOString() });
    const dataObject = event.data.object;
    const tenantId = dataObject.metadata?.tenantId;
    switch (event.type) {
        case "invoice.payment_succeeded": {
            const subscription = dataObject.subscription;
            if (tenantId) {
                await firebase_1.db
                    .collection("tenants")
                    .doc(tenantId)
                    .update({
                    "billing.status": "active",
                    "billing.subscriptionId": subscription,
                });
                (0, withTenant_1.invalidateTenantCache)(tenantId); // Clear cache so new plan loads
                logger_1.logger.info(`Subscription activated for tenant ${tenantId}`);
            }
            break;
        }
        case "customer.subscription.deleted": {
            if (tenantId) {
                await firebase_1.db
                    .collection("tenants")
                    .doc(tenantId)
                    .update({
                    "billing.status": "canceled",
                });
                (0, withTenant_1.invalidateTenantCache)(tenantId); // Clear cache so downgraded features load
                logger_1.logger.info(`Subscription canceled for tenant ${tenantId}`);
            }
            break;
        }
        default:
            logger_1.logger.info(`Unhandled event type ${event.type}`);
    }
    res.status(200).send({ received: true });
});
