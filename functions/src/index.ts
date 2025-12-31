// functions/src/index.ts
import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2/options";

// ⚠️ IMPORTANTE: Configuração global Functions v2 deve vir ANTES dos exports
setGlobalOptions({
  region: "southamerica-east1",
  timeoutSeconds: 120,
  memory: "512MiB",
});

import { createExpressApp } from "./app/createExpressApp";

// Exports de schedulers/triggers
export { cfoNightly } from "./scheduler/cfoCron";
export { pulseAggregateOnWrite } from "./triggers/pulseAggregate";
export { cleanupExpiredLogs, cleanupExpiredLogsHttp } from "./cron/cleanupExpiredLogs";
export { calculateRealEstateFees } from "./cron/calculateRealEstateFees";
export { stripeWebhook } from "./billing/subscriptionManager";
export { analyticsAggregator } from "./triggers/analyticsAggregator";
export { dailyAging } from "./triggers/dailyAging";

// Firebase Admin init
try {
  admin.app();
} catch {
  admin.initializeApp();
}

// Express app (puro, sem side-effects extra)
export const expressApp = createExpressApp();

// Entrypoint HTTP
export const apiV2 = onRequest(expressApp);
