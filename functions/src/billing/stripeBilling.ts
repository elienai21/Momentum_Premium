import { db } from "src/services/firebase";
import Stripe from "stripe";

import { defineSecret } from "firebase-functions/params";
import { onRequest, Request } from "firebase-functions/v2/https";
import { logger } from "../utils/logger";

// 1. Stripe Initialization Patch
const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");
const STRIPE_PRICE_STARTER = defineSecret("STRIPE_PRICE_STARTER");
const STRIPE_PRICE_PRO = defineSecret("STRIPE_PRICE_PRO");
const STRIPE_PRICE_ENTERPRISE = defineSecret("STRIPE_PRICE_ENTERPRISE");

let stripeClient: Stripe | null = null;

function getStripeClient(): Stripe {
  const key = STRIPE_SECRET_KEY.value();
  if (!stripeClient) {
    stripeClient = new Stripe(key, {
      apiVersion: "2023-10-16",
      typescript: true,
      timeout: 20000,
    });
  }
  return stripeClient;
}

function getPlanToPriceIdMap(): Record<string, string> {
  return {
    starter: STRIPE_PRICE_STARTER.value(),
    pro: STRIPE_PRICE_PRO.value(),
    enterprise: STRIPE_PRICE_ENTERPRISE.value(),
  };
}

// 3. Checkout Session Endpoint
// FIX: Explicitly type request object and infer response object to resolve import error.
export const createCheckoutSession = onRequest(
  { secrets: [STRIPE_SECRET_KEY, STRIPE_PRICE_STARTER, STRIPE_PRICE_PRO, STRIPE_PRICE_ENTERPRISE] },
  async (req: Request, res) => {
    try {
      const stripe = getStripeClient();

      const { plan, tenantId, successUrl, cancelUrl } = req.body as {
        plan?: string;
        tenantId?: string;
        successUrl?: string;
        cancelUrl?: string;
      };

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
        logger.error("Stripe priceId not configured for plan", { plan });
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

      logger.info(
        `Checkout session created for tenant ${tenantId} with plan ${plan}.`
      );
      res.send({ url: session.url });
    } catch (error) {
      logger.error("Stripe checkout session failed:", { error });
      res.status(500).send({ error: "Internal server error." });
    }
  }
);

/**
 * Aggregates unprocessed usage logs and reports them to Stripe for metered billing.
 */
export async function processUsageForBilling() {
  const stripe = getStripeClient();

  const unprocessedLogs = await db
    .collection("usage_logs")
    .where("processedAt", "==", null)
    .limit(500) // Process in batches
    .get();

  if (unprocessedLogs.empty) {
    logger.info("No new usage logs to report to Stripe.");
    return;
  }

  const usageByTenant: { [tenantId: string]: number } = {};
  unprocessedLogs.docs.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
    const data = doc.data();
    usageByTenant[data.tenantId] =
      (usageByTenant[data.tenantId] || 0) + (data.tokens || 0);
  });

  const batch = db.batch();

  for (const tenantId in usageByTenant) {
    try {
      const tenantSnap = await db.collection("tenants").doc(tenantId).get();
      const tenantData = tenantSnap.data();
      const subscriptionItemId = tenantData?.stripeSubscriptionItemId;

      if (subscriptionItemId) {
        await stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
          quantity: usageByTenant[tenantId],
          // timestamp em segundos: agora
          timestamp: Math.floor(Date.now() / 1000),
          action: "increment",
        });
        logger.info("Reported usage to Stripe", {
          tenantId,
          tokens: usageByTenant[tenantId],
        });
      } else {
        logger.warn(
          "Cannot report usage: missing subscription item ID for tenant",
          { tenantId }
        );
      }
    } catch (error) {
      logger.error("Failed to report usage for tenant", { tenantId, error });
    }
  }

  unprocessedLogs.docs.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) =>
    batch.update(doc.ref, { processedAt: new Date().toISOString() })
  );

  await batch.commit();
  logger.info(
    `Processed ${unprocessedLogs.size} usage logs for Stripe billing.`
  );
}

