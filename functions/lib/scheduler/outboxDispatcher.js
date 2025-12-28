"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.outboxDispatcher = void 0;
// src/scheduler/outboxDispatcher.ts
const scheduler_1 = require("firebase-functions/v2/scheduler");
const outbox_1 = require("../core/outbox"); // ✅ volta pro módulo correto
const logger_1 = require("../utils/logger");
exports.outboxDispatcher = (0, scheduler_1.onSchedule)({
    schedule: "every 2 minutes",
    timeZone: "America/Sao_Paulo",
    region: "southamerica-east1", // ✅ única alteração de região
    timeoutSeconds: 120,
    memory: "256MiB",
}, async () => {
    const n = await (0, outbox_1.dispatchPending)(50);
    logger_1.logger.info("Outbox dispatched", { processed: n });
});
