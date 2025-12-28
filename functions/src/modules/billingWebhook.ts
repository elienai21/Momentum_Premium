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

// ============================
// 🔔 POST /billing/webhook
// ============================
billingWebhook.post(
  "/webhook",
  // Se o body já é tratado em outro lugar, esse middleware é opcional
  express.json({ type: "application/json" }),
  async (req: Request, res: Response) => {
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

      logger.info("Stripe webhook recebido", {
        type: event.type,
        traceId: (req as any)?.traceId,
      });

      // ✅ Exemplo de tratamento
      switch (event.type) {
        case "invoice.paid":
          logger.info("Fatura paga com sucesso.", { id: event.id });
          // aqui você pode atualizar Firestore se quiser, usando `db`
          break;
        case "invoice.payment_failed":
          logger.warn("Falha no pagamento da fatura.", { id: event.id });
          break;
        default:
          logger.info("Evento não tratado.", { type: event.type });
      }

      res.status(200).send({ ok: true });
    } catch (err: any) {
      logger.error("Erro no webhook Stripe", {
        error: err.message,
        traceId: (req as any)?.traceId,
      });
      const status =
        err instanceof ApiError && (err as any).status ? (err as any).status : 400;
      res.status(status).send({ ok: false, error: err.message });
    }
  }
);

export const router = billingWebhook;

