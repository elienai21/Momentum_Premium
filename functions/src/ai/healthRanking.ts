import { db } from "src/services/firebase";



export async function computeHealthRanking(limit = 100) {
  // Admin scope: reads latest scores from all tenants
  const tenants = await db.collection("tenants").get();

  const items: Array<{ tenantId: string; score: number; updatedAt: string }> = [];
  for (const doc of tenants.docs) {
    const tenantId = doc.id;
    const hs = await db
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

  await db.collection("admin_aggregates").doc("health_ranking").set({
    generatedAt: new Date().toISOString(),
    items: top,
  });
}



