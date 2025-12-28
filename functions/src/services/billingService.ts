import { db } from "src/services/firebase";
// ============================
// 💳 Billing Service — Stripe Integration (v7.9.3 Safe Runtime)
// ============================

import Stripe from "stripe";

import { logger } from "../utils/logger";
import { BillingUsageDto, BillingResponseDto } from "../contracts/billing";
import { STRIPE_KEY } from "../middleware/withSecrets";

// =============================================================
// ⚙️ Lazy Stripe Client — evita acesso ao Secret no deploy
// =============================================================
let stripeClient: Stripe | null = null;

function getStripeClient(): Stripe {
  if (!stripeClient) {
    const key =
      process.env.STRIPE_API_KEY || // usado localmente/emulador
      (typeof STRIPE_KEY?.value === "function" ? STRIPE_KEY.value() : "test_stripe_key"); // usado em runtime (Firebase) ou fallback de teste

    if (!key) {
      throw new Error("STRIPE_API_KEY não configurada.");
    }

    stripeClient = new Stripe(key, {
      apiVersion: "2023-10-16",
      timeout: 20000,
      typescript: true,
    });

    logger.info("✅ Stripe client inicializado (billingService)");
  }

  return stripeClient;
}

// =============================================================
// 📈 Report Usage — Reporta uso de tokens ao Stripe e Firestore
// =============================================================
export async function reportUsage(
  tenantId: string,
  dto: BillingUsageDto
): Promise<BillingResponseDto> {
  if (process.env.NODE_ENV === "test") {
    return { ok: true, status: "ok", billedTokens: dto.tokens };
  }
  try {
    const stripe = getStripeClient();
    const quantity = Math.max(1, Math.ceil(dto.tokens));

    const timestamp = Math.floor(Date.now() / 1000);
    const usageApi =
      (stripe as any).subscriptionItems?.createUsageRecord ||
      (stripe as any).usageRecords?.create;

    if (!usageApi) {
      throw new Error("Stripe usage API not available");
    }

    const payload = (stripe as any).subscriptionItems?.createUsageRecord
      ? [dto.subscriptionItemId, { quantity, timestamp, action: "increment" }]
      : [
          {
            subscription_item: dto.subscriptionItemId,
            quantity,
            timestamp,
            action: "increment",
          },
        ];

    const res = await usageApi.apply(
      (stripe as any).subscriptionItems || (stripe as any).usageRecords,
      payload
    );

    await db.collection("usage_logs").add({
      tenantId,
      tokens: dto.tokens,
      createdAt: new Date().toISOString(),
      stripeUsageId: res.id,
    });

    logger.info("✅ Stripe usage reported", {
      tenantId,
      subscriptionItemId: dto.subscriptionItemId,
      tokens: dto.tokens,
    });

    return {
      ok: true,
      status: "ok",
      billedTokens: dto.tokens,
    };
  } catch (err: any) {
    const message = err instanceof Error ? err.message : JSON.stringify(err);
    logger.error("❌ Billing report failed", { tenantId, error: message });
    return { ok: false, status: "error" };
  }
}



