import { db } from "src/services/firebase";
import { logger } from "../utils/logger";
import { reconcileStripeAndCreditsForTenant } from "../billing/reconcileStripe";

export async function reconcileAllTenantsBilling() {
  logger.info("Starting nightly billing reconcile job");

  const snap = await db.collection("tenants").get();
  const tenants = snap.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => ({ id: doc.id }));

  for (const t of tenants) {
    try {
      await reconcileStripeAndCreditsForTenant(t.id);
    } catch (err: any) {
      logger.error("Failed to reconcile tenant billing", {
        tenantId: t.id,
        error: err?.message,
      });
    }
  }

  logger.info("Finished nightly billing reconcile job", { tenantCount: tenants.length });
}

