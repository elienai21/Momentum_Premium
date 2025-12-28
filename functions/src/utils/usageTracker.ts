import { db } from "src/services/firebase";
// ============================
// 📈 usageTracker.ts — Unified Usage and Billing Tracker (v7.9.3 Safe Build)
// ============================


import Stripe from "stripe";
import { STRIPE_KEY } from "../middleware/withSecrets";
import { logger } from "./logger";

let stripeClient: Stripe | null = null;

/**
 * Retorna uma instância do Stripe inicializada apenas em runtime.
 * Evita erro "Cannot access secret during deployment".
 */
function getStripeClient(): Stripe {
  try {
    // 🔐 Só inicializa quando realmente for chamado (lazy load)
    if (!stripeClient) {
      const key =
        process.env.STRIPE_API_KEY || // usado localmente ou no emulador
        STRIPE_KEY.value(); // usado no runtime do Firebase

      if (!key) {
        throw new Error("STRIPE_API_KEY não configurada.");
      }

      stripeClient = new Stripe(key, { apiVersion: "2023-10-16" });
      logger.info("✅ Stripe client inicializado com sucesso (lazy load).");
    }

    return stripeClient;
  } catch (err: any) {
    logger.error("❌ Erro ao inicializar Stripe client", { error: err?.message });
    throw err;
  }
}

/**
 * Registra uso interno de IA e tokens no Firestore.
 */
export async function trackUsage(
  tenantId: string,
  provider: "openai" | "gemini",
  tokens: number
) {
  try {
    await db.collection("usage_logs").add({
      tenantId,
      provider,
      tokens,
      timestamp: new Date().toISOString(),
    });

    logger.info("Usage tracked", { tenantId, provider, tokens });
  } catch (err: any) {
    logger.error("Failed to log usage", { error: err?.message, tenantId });
  }
}

/**
 * Reporta consumo (em mil tokens) para o item de assinatura do Stripe.
 */
export async function reportUsageToStripe(subscriptionItemId: string, tokens: number) {
  try {
    // In test environments we skip calling Stripe to keep Jest hermetic.
    if (process.env.NODE_ENV === "test") {
      return;
    }

    const stripe = getStripeClient();
    const quantity = Math.max(1, Math.ceil(tokens / 1000));

    await stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
      quantity,
      timestamp: Math.floor(Date.now() / 1000),
      action: "increment",
    });

    logger.info("Stripe usage reported", { subscriptionItemId, quantity });
  } catch (err: any) {
    logger.error("Failed to report Stripe usage", { error: err?.message });
  }
}



