// functions/src/scheduler/billingReconcile.ts
import { onSchedule } from "firebase-functions/v2/scheduler";
import { db } from "src/services/firebase";
import { logger } from "../utils/logger";
import { reconcileStripeAndCreditsForTenant } from "../billing/reconcileStripe";

// Cron diário às 03:00 UTC (ajusta o horário se quiser)
export const billingReconcile = onSchedule("0 3 * * *", async (event) => {
  logger.info("[billingReconcile] Iniciando rotina de reconciliação diária", {
    time: event.scheduleTime,
  });

  const snap = await db.collection("tenants").get();
  const tenants = snap.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => ({ id: doc.id }));

  logger.info("[billingReconcile] Tenants encontrados", {
    count: tenants.length,
  });

  for (const t of tenants) {
    try {
      await reconcileStripeAndCreditsForTenant(t.id);
    } catch (err: any) {
      logger.error("[billingReconcile] Falha ao reconciliar tenant", {
        tenantId: t.id,
        error: err?.message,
      });
    }
  }

  logger.info("[billingReconcile] Rotina concluída", {
    tenantCount: tenants.length,
  });
});

