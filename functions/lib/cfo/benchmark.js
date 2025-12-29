"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBenchmarks = getBenchmarks;
exports.compareToBenchmark = compareToBenchmark;
const firebase_1 = require("../services/firebase");
async function getBenchmarks(vertical) {
    return {
        vertical,
        averages: { expenseToIncome: 0.72, payrollShare: 0.28, marketingShare: 0.12 },
        updatedAt: new Date().toISOString()
    };
}
async function compareToBenchmark(tenantId, vertical) {
    const memDoc = await firebase_1.db.collection(`tenants/${tenantId}/ai_context`).doc('memory').get();
    const mem = memDoc.data() || { avgMonthlyIncome: 0, avgMonthlyExpense: 0 };
    const bm = await getBenchmarks(vertical);
    const expenseToIncome = (mem.avgMonthlyExpense || 0) / ((mem.avgMonthlyIncome || 1));
    return { benchmark: bm, tenant: { expenseToIncome } };
}
