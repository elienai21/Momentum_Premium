// functions/src/billing/reconcileStripe.ts
import * as stripeModule from "./stripeBilling"; // importa o módulo inteiro, independente de como ele exporta
import { db } from "src/services/firebase";
import { logger } from "../utils/logger";

/**
 * Tenta recuperar a instância do Stripe exportada pelo módulo stripeBilling.
 * Aceita tanto export default quanto export nomeado "stripe".
 */
const stripe: any =
  (stripeModule as any).stripe ||
  (stripeModule as any).default ||
  null;

if (!stripe) {
  // Isso não quebra o build, mas avisa em tempo de execução se algo estiver errado.
  // Em prod, vale garantir que stripeBilling exporta default ou { stripe }.
  logger.warn("[reconcileStripe] Stripe client não encontrado em stripeBilling.ts");
}

export async function reconcileStripeAndCreditsForTenant(tenantId: string) {
  logger.info("Reconciling Stripe and credits for tenant", { tenantId });

  const tenantSnap = await db.collection("tenants").doc(tenantId).get();
  if (!tenantSnap.exists) {
    logger.warn("Tenant not found during billing reconcile", { tenantId });
    return;
  }

  const tenant = tenantSnap.data() as any;
  const stripeCustomerId = tenant.stripeCustomerId;
  if (!stripeCustomerId) {
    logger.info("Tenant has no Stripe customer id, skipping reconcile", { tenantId });
    return;
  }

  if (!stripe) {
    logger.error(
      "[reconcileStripe] Stripe client não configurado. Não é possível reconciliar assinaturas.",
      { tenantId }
    );
    return;
  }

  // 1) Buscar assinaturas no Stripe para este cliente
  const subs = await stripe.subscriptions.list({
    customer: stripeCustomerId,
    status: "all",
    limit: 5,
  });

  const activeSub = subs.data.find(
    (s: any) => s.status === "active" || s.status === "trialing"
  );

  if (!activeSub) {
    logger.info("No active subscription found for tenant", { tenantId });
    // Aqui você pode opcionalmente marcar o tenant como "sem plano ativo"
    return;
  }

  const planIdFromStripe = activeSub.items?.data?.[0]?.price?.id;

  // 2) Comparar com Firestore (planId e billingStatus)
  const currentPlanId = tenant.planId;
  if (currentPlanId !== planIdFromStripe) {
    logger.warn("Plan mismatch between Stripe and Firestore, fixing", {
      tenantId,
      currentPlanId,
      planIdFromStripe,
    });
    await db.collection("tenants").doc(tenantId).update({
      planId: planIdFromStripe,
      billingStatus: activeSub.status,
    });
  }

  // 3) (Opcional) Ajustar créditos mensais com base no plano
  //    Ex.: ler config/plans e garantir que os limites de créditos batem com o plano.
  //    Neste primeiro momento deixamos só o ajuste de planId/billingStatus para evitar complexidade extra.
}

