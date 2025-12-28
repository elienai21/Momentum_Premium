// functions/src/scheduler/cfoCron.ts
import { onSchedule } from "firebase-functions/v2/scheduler";
import { db } from "src/services/firebase";
import { logger } from "../utils/logger";
import { computeHealthScore } from "../cfo/healthScore";

/**
 * CFO Nightly Sentinel
 *
 * Executa toda madrugada para recalcular a saúde financeira de todos os tenants
 * e gerar alertas proativos caso a situação seja crítica.
 */
export const cfoNightly = onSchedule(
  {
    schedule: "0 3 * * *", // 03:00 AM diariamente
    timeZone: "America/Sao_Paulo",
    region: "southamerica-east1",
    timeoutSeconds: 540,
    memory: "512MiB",
  },
  async (event) => {
    logger.info("🛡️ CFO Sentinel: Starting nightly check...");
    const startTime = Date.now();

    try {
      const tenantsSnap = await db.collection("tenants").get();

      if (tenantsSnap.empty) {
        logger.info("CFO Sentinel: No tenants found.");
        return;
      }

      logger.info(
        `CFO Sentinel: Found ${tenantsSnap.size} tenants to process.`
      );

      let processedCount = 0;
      let alertCount = 0;
      const todayKey = new Date().toISOString().split("T")[0];

      for (const tenantDoc of tenantsSnap.docs) {
        const tenantId = tenantDoc.id;

        try {
          const result = await computeHealthScore(tenantId); // system context

          const isCritical =
            result.status !== "UNKNOWN" &&
            (result.score < 50 ||
              result.status === "CRITICAL" ||
              result.status === "DANGER" ||
              result.runwayMonths < 3);

          if (isCritical) {
            await handleCriticalAlert(tenantId, result, todayKey);
            alertCount++;
          }

          processedCount++;
        } catch (err: any) {
          logger.error(
            `CFO Sentinel: Failed to process tenant ${tenantId}`,
            { error: err?.message }
          );
        }
      }

      const duration = Date.now() - startTime;

      logger.info("🛡️ CFO Sentinel: Execution completed.", {
        durationMs: duration,
        processed: processedCount,
        alertsGenerated: alertCount,
      });
    } catch (error: any) {
      logger.error("CFO Sentinel: Fatal error during execution", {
        error: error?.message,
      });
    }
  }
);

async function handleCriticalAlert(
  tenantId: string,
  healthData: any,
  dateKey: string
) {
  const alertsRef = db.collection(`tenants/${tenantId}/alerts`);

  const existingSnap = await alertsRef
    .where("type", "==", "HEALTH_CRITICAL")
    .where("dateKey", "==", dateKey)
    .where("status", "==", "unread")
    .limit(1)
    .get();

  if (!existingSnap.empty) {
    logger.info(
      `CFO Sentinel: Alert already exists for tenant ${tenantId} today. Skipping.`
    );
    return;
  }

  const alertDoc = {
    type: "HEALTH_CRITICAL",
    title: "Alerta de Saúde Financeira",
    message: `Sua saúde financeira está em nível ${healthData.status} (Score: ${healthData.score}). Runway estimado: ${healthData.runwayMonths.toFixed(
      1
    )} meses. Verifique seu fluxo de caixa imediatamente.`,
    severity: "high",
    status: "unread",
    dateKey,
    createdAt: new Date().toISOString(),
    metadata: {
      score: healthData.score,
      runway: healthData.runwayMonths,
      status: healthData.status,
    },
  };

  await alertsRef.add(alertDoc);

  logger.info(
    `CFO Sentinel: Critical alert created for tenant ${tenantId}`
  );
}

