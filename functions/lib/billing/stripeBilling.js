"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCheckoutSession = void 0;
exports.processUsageForBilling = processUsageForBilling;
const firebase_1 = require("../services/firebase");
const stripe_1 = __importDefault(require("stripe"));
const params_1 = require("firebase-functions/params");
const https_1 = require("firebase-functions/v2/https");
const logger_1 = require("../utils/logger");
// 1. Stripe Initialization Patch
const STRIPE_SECRET_KEY = (0, params_1.defineSecret)("STRIPE_SECRET_KEY");
const STRIPE_PRICE_STARTER = (0, params_1.defineSecret)("STRIPE_PRICE_STARTER");
const STRIPE_PRICE_PRO = (0, params_1.defineSecret)("STRIPE_PRICE_PRO");
const STRIPE_PRICE_ENTERPRISE = (0, params_1.defineSecret)("STRIPE_PRICE_ENTERPRISE");
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
function getPlanToPriceIdMap() {
    return {
        starter: STRIPE_PRICE_STARTER.value(),
        pro: STRIPE_PRICE_PRO.value(),
        enterprise: STRIPE_PRICE_ENTERPRISE.value(),
    };
}
// 3. Checkout Session Endpoint
// FIX: Explicitly type request object and infer response object to resolve import error.
exports.createCheckoutSession = (0, https_1.onRequest)({ secrets: [STRIPE_SECRET_KEY, STRIPE_PRICE_STARTER, STRIPE_PRICE_PRO, STRIPE_PRICE_ENTERPRISE] }, async (req, res) => {
    try {
        const stripe = getStripeClient();
        const { plan, tenantId, successUrl, cancelUrl } = req.body;
        if (!plan || !tenantId) {
            res.status(400).send({ error: "Missing plan or tenantId." });
            return;
        }
        const planToPriceIdMap = getPlanToPriceIdMap();
        if (!Object.prototype.hasOwnProperty.call(planToPriceIdMap, plan)) {
            res.status(400).send({ error: "Invalid plan." });
            return;
        }
        const priceId = planToPriceIdMap[plan];
        if (!priceId || !priceId.startsWith("price_") || priceId.includes("placeholder")) {
            logger_1.logger.error("Stripe priceId not configured for plan", { plan });
            res.status(500).send({
                error: `Stripe priceId not configured for plan ${plan}`,
            });
            return;
        }
        const session = await stripe.checkout.sessions.create({
            mode: "subscription",
            payment_method_types: ["card"],
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: { tenantId, plan },
        });
        logger_1.logger.info(`Checkout session created for tenant ${tenantId} with plan ${plan}.`);
        res.send({ url: session.url });
    }
    catch (error) {
        logger_1.logger.error("Stripe checkout session failed:", { error });
        res.status(500).send({ error: "Internal server error." });
    }
});
/**
 * Aggregates unprocessed usage logs and reports them to Stripe for metered billing.
 */
async function processUsageForBilling() {
    const stripe = getStripeClient();
    const unprocessedLogs = await firebase_1.db
        .collection("usage_logs")
        .where("processedAt", "==", null)
        .limit(500) // Process in batches
        .get();
    if (unprocessedLogs.empty) {
        logger_1.logger.info("No new usage logs to report to Stripe.");
        return;
    }
    const usageByTenant = {};
    unprocessedLogs.docs.forEach((doc) => {
        const data = doc.data();
        usageByTenant[data.tenantId] =
            (usageByTenant[data.tenantId] || 0) + (data.tokens || 0);
    });
    const batch = firebase_1.db.batch();
    for (const tenantId in usageByTenant) {
        try {
            const tenantSnap = await firebase_1.db.collection("tenants").doc(tenantId).get();
            const tenantData = tenantSnap.data();
            const subscriptionItemId = tenantData?.stripeSubscriptionItemId;
            if (subscriptionItemId) {
                await stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
                    quantity: usageByTenant[tenantId],
                    // timestamp em segundos: agora
                    timestamp: Math.floor(Date.now() / 1000),
                    action: "increment",
                });
                logger_1.logger.info("Reported usage to Stripe", {
                    tenantId,
                    tokens: usageByTenant[tenantId],
                });
            }
            else {
                logger_1.logger.warn("Cannot report usage: missing subscription item ID for tenant", { tenantId });
            }
        }
        catch (error) {
            logger_1.logger.error("Failed to report usage for tenant", { tenantId, error });
        }
    }
    unprocessedLogs.docs.forEach((doc) => batch.update(doc.ref, { processedAt: new Date().toISOString() }));
    await batch.commit();
    logger_1.logger.info(`Processed ${unprocessedLogs.size} usage logs for Stripe billing.`);
}
