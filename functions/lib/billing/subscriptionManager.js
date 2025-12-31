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
exports.stripeWebhook = (0, https_1.onRequest)({
    secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET],
    region: "southamerica-east1"
}, async (req, res) => {
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
    const traceId = `stripe-sm-${Date.now()}`;
    const eventDocRef = firebase_1.db.collection("stripe_events").doc(eventId);
    const eventData = {
        eventId,
        type: event.type,
        receivedAt: new Date().toISOString(),
        status: "received",
        traceId,
        source: "subscriptionManager",
    };
    // ✅ ATOMIC IDEMPOTENCY: Use create() which fails if doc exists
    try {
        await eventDocRef.create(eventData);
    }
    catch (createErr) {
        // ALREADY_EXISTS error code is 6 in Firestore
        if (createErr.code === 6 || createErr.code === "already-exists") {
            logger_1.logger.info(`Duplicate event ${eventId} ignored (idempotent).`);
            res.status(200).send({ received: true, idempotent: true });
            return;
        }
        throw createErr;
    }
    const dataObject = event.data.object;
    let tenantId = dataObject.metadata?.tenantId;
    // Se não veio no metadata, tenta buscar pelo stripeCustomerId
    if (!tenantId && dataObject.customer) {
        const tenantSnap = await firebase_1.db.collection("tenants")
            .where("billing.stripeCustomerId", "==", dataObject.customer)
            .limit(1)
            .get();
        if (!tenantSnap.empty) {
            tenantId = tenantSnap.docs[0].id;
        }
    }
    if (!tenantId) {
        logger_1.logger.error(`Could not resolve tenantId for Stripe event ${event.type}`, {
            eventId: event.id,
            customer: dataObject.customer
        });
        res.status(200).send({ received: true, resolved: false });
        return;
    }
    const subscriptionId = dataObject.subscription || dataObject.id;
    const periodStart = dataObject.current_period_start ? new Date(dataObject.current_period_start * 1000).toISOString() : null;
    const periodEnd = dataObject.current_period_end ? new Date(dataObject.current_period_end * 1000).toISOString() : null;
    switch (event.type) {
        case "invoice.payment_succeeded":
        case "customer.subscription.updated":
        case "customer.subscription.created": {
            const updateData = {
                "billing.status": dataObject.status || "active",
                "billing.subscriptionId": subscriptionId,
            };
            if (periodStart)
                updateData["billing.currentPeriodStart"] = periodStart;
            if (periodEnd)
                updateData["billing.currentPeriodEnd"] = periodEnd;
            if (dataObject.customer)
                updateData["billing.stripeCustomerId"] = dataObject.customer;
            await firebase_1.db.collection("tenants").doc(tenantId).update(updateData);
            (0, withTenant_1.invalidateTenantCache)(tenantId);
            logger_1.logger.info(`Subscription updated for tenant ${tenantId}`, { eventType: event.type });
            break;
        }
        case "customer.subscription.deleted": {
            await firebase_1.db
                .collection("tenants")
                .doc(tenantId)
                .update({
                "billing.status": "canceled",
            });
            (0, withTenant_1.invalidateTenantCache)(tenantId);
            logger_1.logger.info(`Subscription canceled for tenant ${tenantId}`);
            break;
        }
        default:
            logger_1.logger.info(`Unhandled event type ${event.type}`);
    }
    res.status(200).send({ received: true });
});
