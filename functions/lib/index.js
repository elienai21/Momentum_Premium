"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiV2 = exports.expressApp = exports.outboundWebhook = exports.marketUpdater = exports.dailyAging = exports.analyticsAggregator = exports.stripeWebhook = exports.calculateRealEstateFees = exports.cleanupExpiredLogsHttp = exports.cleanupExpiredLogs = exports.pulseAggregateOnWrite = exports.cfoNightly = void 0;
// functions/src/index.ts
const v2_1 = require("firebase-functions/v2");
// Configuração global Regions v2 - Deve vir ANTES dos exports
(0, v2_1.setGlobalOptions)({
    region: "southamerica-east1",
    timeoutSeconds: 120,
    memory: "512MiB",
    maxInstances: 10,
});
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const createExpressApp_1 = require("./app/createExpressApp");
// Exports de schedulers/triggers
var cfoCron_1 = require("./scheduler/cfoCron");
Object.defineProperty(exports, "cfoNightly", { enumerable: true, get: function () { return cfoCron_1.cfoNightly; } });
var pulseAggregate_1 = require("./triggers/pulseAggregate");
Object.defineProperty(exports, "pulseAggregateOnWrite", { enumerable: true, get: function () { return pulseAggregate_1.pulseAggregateOnWrite; } });
var cleanupExpiredLogs_1 = require("./cron/cleanupExpiredLogs");
Object.defineProperty(exports, "cleanupExpiredLogs", { enumerable: true, get: function () { return cleanupExpiredLogs_1.cleanupExpiredLogs; } });
Object.defineProperty(exports, "cleanupExpiredLogsHttp", { enumerable: true, get: function () { return cleanupExpiredLogs_1.cleanupExpiredLogsHttp; } });
var calculateRealEstateFees_1 = require("./cron/calculateRealEstateFees");
Object.defineProperty(exports, "calculateRealEstateFees", { enumerable: true, get: function () { return calculateRealEstateFees_1.calculateRealEstateFees; } });
var subscriptionManager_1 = require("./billing/subscriptionManager");
Object.defineProperty(exports, "stripeWebhook", { enumerable: true, get: function () { return subscriptionManager_1.stripeWebhook; } });
var analyticsAggregator_1 = require("./triggers/analyticsAggregator");
Object.defineProperty(exports, "analyticsAggregator", { enumerable: true, get: function () { return analyticsAggregator_1.analyticsAggregator; } });
var dailyAging_1 = require("./triggers/dailyAging");
Object.defineProperty(exports, "dailyAging", { enumerable: true, get: function () { return dailyAging_1.dailyAging; } });
var marketUpdater_1 = require("./scheduler/marketUpdater");
Object.defineProperty(exports, "marketUpdater", { enumerable: true, get: function () { return marketUpdater_1.marketUpdater; } });
var outboundWebhook_1 = require("./triggers/outboundWebhook");
Object.defineProperty(exports, "outboundWebhook", { enumerable: true, get: function () { return outboundWebhook_1.outboundWebhook; } });
// Firebase Admin init
try {
    admin.app();
}
catch {
    admin.initializeApp();
}
// Express app (puro, sem side-effects extra)
exports.expressApp = (0, createExpressApp_1.createExpressApp)();
// Entrypoint HTTP
exports.apiV2 = (0, https_1.onRequest)({
    timeoutSeconds: 300,
    memory: "1GiB",
    cors: true,
    region: "southamerica-east1",
}, exports.expressApp);
