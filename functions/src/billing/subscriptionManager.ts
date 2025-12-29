import { db } from "src/services/firebase";

import { onRequest, Request } from "firebase-functions/v2/https";
import Stripe from "stripe";
import { defineSecret } from "firebase-functions/params";
import { logger } from "../utils/logger";
import { invalidateTenantCache } from "../middleware/withTenant";

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
    const traceId = `stripe-sm-${Date.now()}`;
    const eventDocRef = db.collection("stripe_events").doc(eventId);
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
    } catch (createErr: any) {
      // ALREADY_EXISTS error code is 6 in Firestore
      if (createErr.code === 6 || createErr.code === "already-exists") {
        logger.info(`Duplicate event ${eventId} ignored (idempotent).`);
        res.status(200).send({ received: true, idempotent: true });
        return;
      }
      throw createErr;
    }

    const dataObject = event.data.object as any;
    let tenantId = dataObject.metadata?.tenantId;

    // Se não veio no metadata, tenta buscar pelo stripeCustomerId
    if (!tenantId && dataObject.customer) {
      const tenantSnap = await db.collection("tenants")
        .where("billing.stripeCustomerId", "==", dataObject.customer)
        .limit(1)
        .get();

      if (!tenantSnap.empty) {
        tenantId = tenantSnap.docs[0].id;
      }
    }

    if (!tenantId) {
      logger.error(`Could not resolve tenantId for Stripe event ${event.type}`, {
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
        const updateData: any = {
          "billing.status": dataObject.status || "active",
          "billing.subscriptionId": subscriptionId,
        };

        if (periodStart) updateData["billing.currentPeriodStart"] = periodStart;
        if (periodEnd) updateData["billing.currentPeriodEnd"] = periodEnd;
        if (dataObject.customer) updateData["billing.stripeCustomerId"] = dataObject.customer;

        await db.collection("tenants").doc(tenantId).update(updateData);
        invalidateTenantCache(tenantId);
        logger.info(`Subscription updated for tenant ${tenantId}`, { eventType: event.type });
        break;
      }

      case "customer.subscription.deleted": {
        await db
          .collection("tenants")
          .doc(tenantId)
          .update({
            "billing.status": "canceled",
          });
        invalidateTenantCache(tenantId);
        logger.info(`Subscription canceled for tenant ${tenantId}`);
        break;
      }

      default:
        logger.info(`Unhandled event type ${event.type}`);
    }

    res.status(200).send({ received: true });
  }
);

