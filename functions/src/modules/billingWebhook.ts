import { db } from "src/services/firebase";
// ============================
// 💳 Billing Webhook — Stripe Events Listener (v7.9.1 Clean Build)
// ============================

import express, { Request, Response } from "express";
import { Router } from "express";
import { logger } from "../utils/logger";
import Stripe from "stripe";
import { STRIPE_KEY } from "../middleware/withSecrets";
import { ApiError } from "../utils/errors";

export const billingWebhook = Router();

// ✅ Lazy init do Stripe client — evita usar STRIPE_KEY.value() no escopo global
let stripeClient: Stripe | null = null;

function getStripeClient(): Stripe {
  if (!stripeClient) {
    const key = STRIPE_KEY.value() as string;
    stripeClient = new Stripe(key, {
      apiVersion: "2023-10-16",
      timeout: 20000,
      typescript: true,
    });
  }
  return stripeClient;
}

billingWebhook.post(
  "/webhook",
  // Se o body já é tratado em outro lugar, esse middleware é opcional
  express.json({ type: "application/json" }),
  async (req: Request, res: Response) => {
    const traceId = (req as any)?.traceId || `stripe-${Date.now()}`;

    try {
      const signature = req.headers["stripe-signature"];
      if (!signature) {
        throw new ApiError(400, "Missing stripe-signature header");
      }

      // Em Functions, normalmente rawBody vem de middleware da Functions.
      // Usamos rawBody se existir, senão usamos o body parseado.
      const payload = (req as any).rawBody || req.body;

      const stripe = getStripeClient();

      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        throw new Error("STRIPE_WEBHOOK_SECRET não configurado");
      }

      const event = stripe.webhooks.constructEvent(
        payload,
        signature as string,
        webhookSecret
      );

      // ✅ ATOMIC IDEMPOTENCY: Use create() which fails if doc exists (AlreadyExists error)
      // This eliminates race condition between get() and set()
      const eventDocRef = db.collection("stripe_events").doc(event.id);
      const eventData = {
        eventId: event.id,
        type: event.type,
        receivedAt: new Date().toISOString(),
        status: "received",
        traceId,
        requestId: (req as any).requestId || traceId,
      };

      try {
        // Atomic create - fails with code 6 (ALREADY_EXISTS) if document exists
        await eventDocRef.create(eventData);
      } catch (createErr: any) {
        // ALREADY_EXISTS error code is 6 in Firestore
        if (createErr.code === 6 || createErr.code === "already-exists") {
          // Document already exists - return 200 immediately (idempotent)
          const existingDoc = await eventDocRef.get();
          const existingData = existingDoc.data();
          logger.info("Stripe webhook: duplicate event (idempotent)", {
            eventId: event.id,
            type: event.type,
            status: existingData?.status,
            firstReceivedAt: existingData?.receivedAt,
            firstTraceId: existingData?.traceId,
            currentTraceId: traceId,
          });
          return res.status(200).send({ ok: true, idempotent: true });
        }
        // Re-throw other errors
        throw createErr;
      }

      logger.info("Stripe webhook received", {
        type: event.type,
        eventId: event.id,
        traceId,
      });

      // ✅ Process event
      try {
        switch (event.type) {
          case "invoice.paid":
            logger.info("Fatura paga com sucesso.", { id: event.id, traceId });
            // aqui você pode atualizar Firestore se quiser
            break;
          case "invoice.payment_failed":
            logger.warn("Falha no pagamento da fatura.", { id: event.id, traceId });
            break;
          default:
            logger.info("Evento não tratado.", { type: event.type, traceId });
        }

        // ✅ Mark as processed
        await eventDocRef.update({
          status: "processed",
          processedAt: new Date().toISOString(),
        });

        res.status(200).send({ ok: true });
      } catch (processingErr: any) {
        // ✅ Mark as failed (without stack trace)
        await eventDocRef.update({
          status: "failed",
          errorCode: processingErr.code || "PROCESSING_ERROR",
          errorMessage: processingErr.message?.substring(0, 200),
          failedAt: new Date().toISOString(),
        });
        throw processingErr;
      }
    } catch (err: any) {
      logger.error("Erro no webhook Stripe", {
        error: err.message,
        code: err.code,
        traceId,
      });
      const status =
        err instanceof ApiError && (err as any).status ? (err as any).status : 400;
      res.status(status).send({ ok: false, error: err.message });
    }
  }
);

export const router = billingWebhook;

