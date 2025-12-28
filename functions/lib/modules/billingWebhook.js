"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = exports.billingWebhook = void 0;
// ============================
// 💳 Billing Webhook — Stripe Events Listener (v7.9.1 Clean Build)
// ============================
const express_1 = __importDefault(require("express"));
const express_2 = require("express");
const logger_1 = require("../utils/logger");
const stripe_1 = __importDefault(require("stripe"));
const withSecrets_1 = require("../middleware/withSecrets");
const errors_1 = require("../utils/errors");
exports.billingWebhook = (0, express_2.Router)();
// ✅ Lazy init do Stripe client — evita usar STRIPE_KEY.value() no escopo global
let stripeClient = null;
function getStripeClient() {
    if (!stripeClient) {
        const key = withSecrets_1.STRIPE_KEY.value();
        stripeClient = new stripe_1.default(key, {
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
exports.billingWebhook.post("/webhook", 
// Se o body já é tratado em outro lugar, esse middleware é opcional
express_1.default.json({ type: "application/json" }), async (req, res) => {
    try {
        const signature = req.headers["stripe-signature"];
        if (!signature) {
            throw new errors_1.ApiError(400, "Missing stripe-signature header");
        }
        // Em Functions, normalmente rawBody vem de middleware da Functions.
        // Usamos rawBody se existir, senão usamos o body parseado.
        const payload = req.rawBody || req.body;
        const stripe = getStripeClient();
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!webhookSecret) {
            throw new Error("STRIPE_WEBHOOK_SECRET não configurado");
        }
        const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
        logger_1.logger.info("Stripe webhook recebido", {
            type: event.type,
            traceId: req?.traceId,
        });
        // ✅ Exemplo de tratamento
        switch (event.type) {
            case "invoice.paid":
                logger_1.logger.info("Fatura paga com sucesso.", { id: event.id });
                // aqui você pode atualizar Firestore se quiser, usando `db`
                break;
            case "invoice.payment_failed":
                logger_1.logger.warn("Falha no pagamento da fatura.", { id: event.id });
                break;
            default:
                logger_1.logger.info("Evento não tratado.", { type: event.type });
        }
        res.status(200).send({ ok: true });
    }
    catch (err) {
        logger_1.logger.error("Erro no webhook Stripe", {
            error: err.message,
            traceId: req?.traceId,
        });
        const status = err instanceof errors_1.ApiError && err.status ? err.status : 400;
        res.status(status).send({ ok: false, error: err.message });
    }
});
exports.router = exports.billingWebhook;
