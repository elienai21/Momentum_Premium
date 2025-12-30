// functions/src/index.ts
import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2/options";
import { createExpressApp } from "./app/createExpressApp";

// Exports de schedulers/triggers
export { cfoNightly } from "./scheduler/cfoCron";
export { pulseAggregateOnWrite } from "./triggers/pulseAggregate";
export { cleanupExpiredLogs, cleanupExpiredLogsHttp } from "./cron/cleanupExpiredLogs";
export { calculateRealEstateFees } from "./cron/calculateRealEstateFees";
export { stripeWebhook } from "./billing/subscriptionManager";
export { analyticsAggregator } from "./triggers/analyticsAggregator";

// Firebase Admin init
try {
  admin.app();
} catch {
  admin.initializeApp();
}

// Configuração global Functions v2
setGlobalOptions({
  region: "southamerica-east1",
  timeoutSeconds: 120,
  memory: "512MiB",
});

// Express app (puro, sem side-effects extra)
export const expressApp = createExpressApp();

// Entrypoint HTTP
export const apiV2 = onRequest(expressApp);
