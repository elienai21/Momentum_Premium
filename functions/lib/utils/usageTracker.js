"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackUsage = trackUsage;
exports.reportUsageToStripe = reportUsageToStripe;
const firebase_1 = require("src/services/firebase");
// ============================
// 📈 usageTracker.ts — Unified Usage and Billing Tracker (v7.9.3 Safe Build)
// ============================
const stripe_1 = __importDefault(require("stripe"));
const withSecrets_1 = require("../middleware/withSecrets");
const logger_1 = require("./logger");
let stripeClient = null;
/**
 * Retorna uma instância do Stripe inicializada apenas em runtime.
 * Evita erro "Cannot access secret during deployment".
 */
function getStripeClient() {
    try {
        // 🔐 Só inicializa quando realmente for chamado (lazy load)
        if (!stripeClient) {
            const key = process.env.STRIPE_API_KEY || // usado localmente ou no emulador
                withSecrets_1.STRIPE_KEY.value(); // usado no runtime do Firebase
            if (!key) {
                throw new Error("STRIPE_API_KEY não configurada.");
            }
            stripeClient = new stripe_1.default(key, { apiVersion: "2023-10-16" });
            logger_1.logger.info("✅ Stripe client inicializado com sucesso (lazy load).");
        }
        return stripeClient;
    }
    catch (err) {
        logger_1.logger.error("❌ Erro ao inicializar Stripe client", { error: err?.message });
        throw err;
    }
}
/**
 * Registra uso interno de IA e tokens no Firestore.
 */
async function trackUsage(tenantId, provider, tokens) {
    try {
        await firebase_1.db.collection("usage_logs").add({
            tenantId,
            provider,
            tokens,
            timestamp: new Date().toISOString(),
        });
        logger_1.logger.info("Usage tracked", { tenantId, provider, tokens });
    }
    catch (err) {
        logger_1.logger.error("Failed to log usage", { error: err?.message, tenantId });
    }
}
/**
 * Reporta consumo (em mil tokens) para o item de assinatura do Stripe.
 */
async function reportUsageToStripe(subscriptionItemId, tokens) {
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
        logger_1.logger.info("Stripe usage reported", { subscriptionItemId, quantity });
    }
    catch (err) {
        logger_1.logger.error("Failed to report Stripe usage", { error: err?.message });
    }
}
