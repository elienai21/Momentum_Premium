"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.reconcileStripeAndCreditsForTenant = reconcileStripeAndCreditsForTenant;
// functions/src/billing/reconcileStripe.ts
const stripeModule = __importStar(require("./stripeBilling")); // importa o módulo inteiro, independente de como ele exporta
const firebase_1 = require("../services/firebase");
const logger_1 = require("../utils/logger");
/**
 * Tenta recuperar a instância do Stripe exportada pelo módulo stripeBilling.
 * Aceita tanto export default quanto export nomeado "stripe".
 */
const stripe = stripeModule.stripe ||
    stripeModule.default ||
    null;
if (!stripe) {
    // Isso não quebra o build, mas avisa em tempo de execução se algo estiver errado.
    // Em prod, vale garantir que stripeBilling exporta default ou { stripe }.
    logger_1.logger.warn("[reconcileStripe] Stripe client não encontrado em stripeBilling.ts");
}
async function reconcileStripeAndCreditsForTenant(tenantId) {
    logger_1.logger.info("Reconciling Stripe and credits for tenant", { tenantId });
    const tenantSnap = await firebase_1.db.collection("tenants").doc(tenantId).get();
    if (!tenantSnap.exists) {
        logger_1.logger.warn("Tenant not found during billing reconcile", { tenantId });
        return;
    }
    const tenant = tenantSnap.data();
    const stripeCustomerId = tenant.stripeCustomerId;
    if (!stripeCustomerId) {
        logger_1.logger.info("Tenant has no Stripe customer id, skipping reconcile", { tenantId });
        return;
    }
    if (!stripe) {
        logger_1.logger.error("[reconcileStripe] Stripe client não configurado. Não é possível reconciliar assinaturas.", { tenantId });
        return;
    }
    // 1) Buscar assinaturas no Stripe para este cliente
    const subs = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        status: "all",
        limit: 5,
    });
    const activeSub = subs.data.find((s) => s.status === "active" || s.status === "trialing");
    if (!activeSub) {
        logger_1.logger.info("No active subscription found for tenant", { tenantId });
        // Aqui você pode opcionalmente marcar o tenant como "sem plano ativo"
        return;
    }
    const planIdFromStripe = activeSub.items?.data?.[0]?.price?.id;
    // 2) Comparar com Firestore (planId e billingStatus)
    const currentPlanId = tenant.planId;
    if (currentPlanId !== planIdFromStripe) {
        logger_1.logger.warn("Plan mismatch between Stripe and Firestore, fixing", {
            tenantId,
            currentPlanId,
            planIdFromStripe,
        });
        await firebase_1.db.collection("tenants").doc(tenantId).update({
            planId: planIdFromStripe,
            billingStatus: activeSub.status,
        });
    }
    // 3) (Opcional) Ajustar créditos mensais com base no plano
    //    Ex.: ler config/plans e garantir que os limites de créditos batem com o plano.
    //    Neste primeiro momento deixamos só o ajuste de planId/billingStatus para evitar complexidade extra.
}
