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
exports.analyticsAggregator = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
const logger_1 = require("../utils/logger");
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
const { FieldValue } = admin.firestore;
function parseContribution(data) {
    if (!data)
        return { revenue: 0, expenses: 0 };
    const rawAmount = Number(data.amount ?? data.value ?? 0);
    const isOut = data.type === "out" || rawAmount < 0;
    const magnitude = Math.abs(rawAmount);
    return isOut
        ? { revenue: 0, expenses: magnitude }
        : { revenue: magnitude, expenses: 0 };
}
exports.analyticsAggregator = (0, firestore_1.onDocumentWritten)({
    document: "tenants/{tenantId}/transactions/{txId}",
    region: "southamerica-east1",
}, async (event) => {
    const tenantId = event.params.tenantId;
    if (!tenantId) {
        logger_1.logger.warn("[analyticsAggregator] missing tenantId in params");
        return;
    }
    const before = parseContribution(event.data?.before?.data());
    const after = parseContribution(event.data?.after?.data());
    const deltaRevenue = after.revenue - before.revenue;
    const deltaExpenses = after.expenses - before.expenses;
    const deltaCount = (event.data?.after.exists ? 1 : 0) - (event.data?.before.exists ? 1 : 0);
    const deltaBalance = deltaRevenue - deltaExpenses;
    const statsRef = db.doc(`tenants/${tenantId}/stats/financial_overview`);
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(statsRef);
        const exists = snap.exists;
        const payload = {
            totalRevenue: FieldValue.increment(deltaRevenue),
            totalExpenses: FieldValue.increment(deltaExpenses),
            balance: FieldValue.increment(deltaBalance),
            transactionCount: FieldValue.increment(deltaCount),
        };
        if (!exists) {
            payload.totalRevenue = (before.revenue ? 0 : 0) + deltaRevenue;
            payload.totalExpenses = (before.expenses ? 0 : 0) + deltaExpenses;
            payload.balance = deltaBalance;
            payload.transactionCount = deltaCount;
        }
        tx.set(statsRef, {
            totalRevenue: payload.totalRevenue,
            totalExpenses: payload.totalExpenses,
            balance: payload.balance,
            transactionCount: payload.transactionCount,
            updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
    });
    logger_1.logger.info("[analyticsAggregator] Stats updated", {
        tenantId,
        deltaRevenue,
        deltaExpenses,
        deltaCount,
    });
});
