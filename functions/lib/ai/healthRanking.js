"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeHealthRanking = computeHealthRanking;
const firebase_1 = require("src/services/firebase");
async function computeHealthRanking(limit = 100) {
    // Admin scope: reads latest scores from all tenants
    const tenants = await firebase_1.db.collection("tenants").get();
    const items = [];
    for (const doc of tenants.docs) {
        const tenantId = doc.id;
        const hs = await firebase_1.db
            .doc(`tenants/${tenantId}/insights/healthScore`)
            .get();
        if (hs.exists) {
            const { score = 0, updatedAt = new Date().toISOString() } = hs.data() || {};
            items.push({ tenantId, score, updatedAt });
        }
    }
    // Sort and store top N in an aggregated collection (admin-only)
    items.sort((a, b) => b.score - a.score);
    const top = items.slice(0, limit);
    await firebase_1.db.collection("admin_aggregates").doc("health_ranking").set({
        generatedAt: new Date().toISOString(),
        items: top,
    });
}
