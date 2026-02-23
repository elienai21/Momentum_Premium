// functions/src/cron/handleTrialExpirations.ts
// Verifica trials expirados e atualiza billingStatus automaticamente.
// Executa diariamente as 2h (antes dos outros jobs das 3h).

import { onSchedule } from "firebase-functions/v2/scheduler";
import { db } from "src/services/firebase";
import { logger } from "../utils/logger";

export const handleTrialExpirations = onSchedule(
  {
    schedule: "0 2 * * *",
    timeZone: "America/Sao_Paulo",
    region: "southamerica-east1",
    timeoutSeconds: 300,
    memory: "256MiB",
  },
  async (event) => {
    logger.info("[handleTrialExpirations] Starting daily check", {
      time: event.scheduleTime,
    });

    const now = new Date();
    let expiredCount = 0;
    let errorCount = 0;

    try {
      // Busca todos os tenants com trial ativo
      const tenantsSnap = await db
        .collection("tenants")
        .where("billingStatus", "==", "trial-active")
        .get();

      if (tenantsSnap.empty) {
        logger.info("[handleTrialExpirations] No active trials found");
        return;
      }

      logger.info("[handleTrialExpirations] Active trials found", {
        count: tenantsSnap.size,
      });

      for (const tenantDoc of tenantsSnap.docs) {
        const tenantId = tenantDoc.id;
        const data = tenantDoc.data();

        try {
          const trialEndsAt = data.trialEndsAt
            ? new Date(data.trialEndsAt)
            : null;

          if (!trialEndsAt) {
            logger.warn("[handleTrialExpirations] Tenant without trialEndsAt", {
              tenantId,
            });
            continue;
          }

          if (trialEndsAt <= now) {
            // Trial expirado: atualizar status
            await db.collection("tenants").doc(tenantId).update({
              billingStatus: "trial-expired",
              trialExpiredAt: now.toISOString(),
            });

            expiredCount++;
            logger.info("[handleTrialExpirations] Trial expired", {
              tenantId,
              trialEndsAt: trialEndsAt.toISOString(),
            });
          }
        } catch (err: any) {
          errorCount++;
          logger.error("[handleTrialExpirations] Error processing tenant", {
            tenantId,
            error: err?.message,
          });
        }
      }

      logger.info("[handleTrialExpirations] Check completed", {
        tenantsChecked: tenantsSnap.size,
        expired: expiredCount,
        errors: errorCount,
      });
    } catch (err: any) {
      logger.error("[handleTrialExpirations] Fatal error", {
        error: err?.message,
      });
    }
  },
);
