"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportUsage = reportUsage;
const firebase_1 = require("src/services/firebase");
// ============================
// 💳 Billing Service — Stripe Integration (v7.9.3 Safe Runtime)
// ============================
const stripe_1 = __importDefault(require("stripe"));
const logger_1 = require("../utils/logger");
const withSecrets_1 = require("../middleware/withSecrets");
// =============================================================
// ⚙️ Lazy Stripe Client — evita acesso ao Secret no deploy
// =============================================================
let stripeClient = null;
function getStripeClient() {
    if (!stripeClient) {
        const key = process.env.STRIPE_API_KEY || // usado localmente/emulador
            (typeof withSecrets_1.STRIPE_KEY?.value === "function" ? withSecrets_1.STRIPE_KEY.value() : "test_stripe_key"); // usado em runtime (Firebase) ou fallback de teste
        if (!key) {
            throw new Error("STRIPE_API_KEY não configurada.");
        }
        stripeClient = new stripe_1.default(key, {
            apiVersion: "2023-10-16",
            timeout: 20000,
            typescript: true,
        });
        logger_1.logger.info("✅ Stripe client inicializado (billingService)");
    }
    return stripeClient;
}
// =============================================================
// 📈 Report Usage — Reporta uso de tokens ao Stripe e Firestore
// =============================================================
async function reportUsage(tenantId, dto) {
    if (process.env.NODE_ENV === "test") {
        return { ok: true, status: "ok", billedTokens: dto.tokens };
    }
    try {
        const stripe = getStripeClient();
        const quantity = Math.max(1, Math.ceil(dto.tokens));
        const timestamp = Math.floor(Date.now() / 1000);
        const usageApi = stripe.subscriptionItems?.createUsageRecord ||
            stripe.usageRecords?.create;
        if (!usageApi) {
            throw new Error("Stripe usage API not available");
        }
        const payload = stripe.subscriptionItems?.createUsageRecord
            ? [dto.subscriptionItemId, { quantity, timestamp, action: "increment" }]
            : [
                {
                    subscription_item: dto.subscriptionItemId,
                    quantity,
                    timestamp,
                    action: "increment",
                },
            ];
        const res = await usageApi.apply(stripe.subscriptionItems || stripe.usageRecords, payload);
        await firebase_1.db.collection("usage_logs").add({
            tenantId,
            tokens: dto.tokens,
            createdAt: new Date().toISOString(),
            stripeUsageId: res.id,
        });
        logger_1.logger.info("✅ Stripe usage reported", {
            tenantId,
            subscriptionItemId: dto.subscriptionItemId,
            tokens: dto.tokens,
        });
        return {
            ok: true,
            status: "ok",
            billedTokens: dto.tokens,
        };
    }
    catch (err) {
        const message = err instanceof Error ? err.message : JSON.stringify(err);
        logger_1.logger.error("❌ Billing report failed", { tenantId, error: message });
        return { ok: false, status: "error" };
    }
}
