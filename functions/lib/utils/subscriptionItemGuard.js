"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscriptionItemBelongsToTenant = subscriptionItemBelongsToTenant;
const firebase_1 = require("../services/firebase");
function collectAllowedSubscriptionItems(data) {
    if (!data)
        return [];
    const billing = data.billing || {};
    const candidates = [
        billing.subscriptionItemId,
        billing.stripeSubscriptionItemId,
        data.subscriptionItemId,
        data.stripeSubscriptionItemId,
    ];
    return candidates.filter((value) => typeof value === "string" && value.trim().length > 0);
}
async function subscriptionItemBelongsToTenant(tenantId, subscriptionItemId) {
    const snap = await firebase_1.db.collection("tenants").doc(tenantId).get();
    if (!snap.exists)
        return false;
    const allowed = collectAllowedSubscriptionItems(snap.data());
    return allowed.includes(subscriptionItemId);
}
