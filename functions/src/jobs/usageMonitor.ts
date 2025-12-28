// src/jobs/usageMonitor.ts
import { db } from "src/services/firebase";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "../utils/logger";

/**
 * Verifica tenants sem atividade recente e cria alerta de inatividade.
 * Agendamento: diariamente 09:00 (Horário de São Paulo)
 */
export const usageMonitor = onSchedule(
  {
    schedule: "0 9 * * *", // 09:00 AM
    timeZone: "America/Sao_Paulo",
    region: "southamerica-east1",     // ✅
    timeoutSeconds: 300,
    memory: "256MiB",
  },
  async (event) => {
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const cutoff = new Date(now - sevenDays).toISOString();

    const tenantsSnap = await db.collection("tenants").get();
    let count = 0;

    for (const t of tenantsSnap.docs) {
      const tid = t.id;
      try {
        const last = await db
          .doc(`tenants/${tid}/analytics/lastActivity`)
          .get();
        const lastAt =
          (last.exists ? (last.data() as any).timestamp : null) || null;

        if (!lastAt || lastAt < cutoff) {
          await db.collection(`tenants/${tid}/alerts`).add({
            type: "inactivity",
            level: "info",
            message:
              "Detectamos inatividade superior a 7 dias. Deseja uma orientação rápida?",
            createdAt: new Date().toISOString(),
            read: false,
          });
          count++;
        }
      } catch (e) {
        logger.warn("usageMonitor tenant failed", {
          tenantId: tid,
          error: (e as any)?.message,
        });
      }
    }

    logger.info("usageMonitor finished", { tenantsFlagged: count });
  }
);

