import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import { calculateAgingSnapshot } from "../services/realEstateService";
import { logger } from "../utils/logger";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const dailyAging = onSchedule(
  {
    schedule: "0 3 * * *",
    timeZone: "America/Sao_Paulo",
    region: "southamerica-east1",
  },
  async () => {
    const tenantDocs = await db.collection("tenants").listDocuments();
    for (const tenantRef of tenantDocs) {
      try {
        await calculateAgingSnapshot(tenantRef.id);
      } catch (err: any) {
        logger.error("[dailyAging] failed", { tenantId: tenantRef.id, error: err?.message });
      }
    }
  }
);
