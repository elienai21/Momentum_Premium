import { db } from "src/services/firebase";

import { onRequest, Request } from "firebase-functions/v2/https";
import Stripe from "stripe";
import { defineSecret } from "firebase-functions/params";
import { logger } from "../utils/logger";

const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = defineSecret("STRIPE_WEBHOOK_SECRET");

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

// FIX: Explicitly type request object and infer response object to resolve import error.
export const stripeWebhook = onRequest(
  { secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET] },
  async (req: Request, res) => {
    const sig = req.headers["stripe-signature"];
    let event: Stripe.Event;

    if (!sig) {
      logger.error("Missing stripe-signature header on webhook");
      res.status(400).send("Missing stripe-signature header");
      return;
    }

    try {
      const stripe = getStripeClient();
      // rawBody é exposto pelo Cloud Functions v2 quando o body parser é configurado corretamente
      event = stripe.webhooks.constructEvent(
        (req as any).rawBody,
        sig as string,
        STRIPE_WEBHOOK_SECRET.value()
      );
    } catch (err: any) {
      logger.error("Invalid Stripe webhook signature:", { error: err });
      res.status(400).send(`Webhook error: ${err.message}`);
      return;
    }

    const eventId = event.id;
    const existing = await db.collection("webhook_events").doc(eventId).get();
    if (existing.exists) {
      logger.warn(`Duplicate event ${eventId} ignored.`);
      res.status(200).send({ received: true });
      return;
    }

    await db
      .collection("webhook_events")
      .doc(eventId)
      .set({ id: eventId, type: event.type, created: new Date().toISOString() });

    const dataObject = event.data.object as any;
    const tenantId = dataObject.metadata?.tenantId;

    switch (event.type) {
      case "invoice.payment_succeeded": {
        const subscription = dataObject.subscription;
        if (tenantId) {
          await db
            .collection("tenants")
            .doc(tenantId)
            .update({
              "billing.status": "active",
              "billing.subscriptionId": subscription,
            });
          logger.info(`Subscription activated for tenant ${tenantId}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        if (tenantId) {
          await db
            .collection("tenants")
            .doc(tenantId)
            .update({
              "billing.status": "canceled",
            });
          logger.info(`Subscription canceled for tenant ${tenantId}`);
        }
        break;
      }

      default:
        logger.info(`Unhandled event type ${event.type}`);
    }

    res.status(200).send({ received: true });
  }
);

