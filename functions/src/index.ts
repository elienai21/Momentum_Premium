// functions/src/index.ts
import { setGlobalOptions } from "firebase-functions/v2";

// Configuração global Regions v2 - Deve vir ANTES dos exports
setGlobalOptions({
  region: "southamerica-east1",
  timeoutSeconds: 120,
  memory: "512MiB",
  maxInstances: 10,
});

import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
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
export const apiV2 = onRequest(
  {
    timeoutSeconds: 300,
    memory: "1GiB",
    cors: true,
    region: "southamerica-east1",
  },
  expressApp
);
