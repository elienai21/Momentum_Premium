import { db } from "src/services/firebase";

function collectAllowedSubscriptionItems(data: Record<string, any> | undefined) {
  if (!data) return [];
  const billing = data.billing || {};
  const candidates = [
    billing.subscriptionItemId,
    billing.stripeSubscriptionItemId,
    data.subscriptionItemId,
    data.stripeSubscriptionItemId,
  ];

  return candidates.filter(
    (value): value is string => typeof value === "string" && value.trim().length > 0
  );
}

export async function subscriptionItemBelongsToTenant(
  tenantId: string,
  subscriptionItemId: string
): Promise<boolean> {
  const snap = await db.collection("tenants").doc(tenantId).get();
  if (!snap.exists) return false;

  const allowed = collectAllowedSubscriptionItems(snap.data());
  return allowed.includes(subscriptionItemId);
}
