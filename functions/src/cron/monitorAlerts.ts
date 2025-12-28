// src/cron/monitorAlerts.ts
import { db } from "src/services/firebase";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "../utils/logger";

export const monitorAlerts = onSchedule(
  {
    schedule: "every 30 minutes",
    timeZone: "America/Sao_Paulo",
    region: "southamerica-east1",     // ✅
    timeoutSeconds: 120,
    memory: "256MiB",
  },
  async (event) => {
    const recent = Date.now() - 1000 * 60 * 30;
    const snapshot = await db
      .collection("system_metrics")
      .where("timestamp", ">=", new Date(recent).toISOString())
      .get();

    const slowRequests = snapshot.docs.filter(
      (d: FirebaseFirestore.QueryDocumentSnapshot) => (d.data().latencyMs ?? 0) > 1500
    );

    if (slowRequests.length > 0) {
      await db.collection("system_alerts").add({
        type: "performance",
        message: `${slowRequests.length} slow API calls detected.`,
        createdAt: new Date().toISOString(),
      });
      logger.warn("Performance alert generated", {
        count: slowRequests.length,
      });
    }
  }
);

