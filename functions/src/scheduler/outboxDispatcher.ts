// src/scheduler/outboxDispatcher.ts
import { onSchedule } from "firebase-functions/v2/scheduler";
import { dispatchPending } from "../core/outbox";   // ✅ volta pro módulo correto
import { logger } from "../utils/logger";

export const outboxDispatcher = onSchedule(
  {
    schedule: "every 2 minutes",
    timeZone: "America/Sao_Paulo",
    region: "southamerica-east1",   // ✅ única alteração de região
    timeoutSeconds: 120,
    memory: "256MiB",
  },
  async () => {
    const n = await dispatchPending(50);
    logger.info("Outbox dispatched", { processed: n });
  }
);
