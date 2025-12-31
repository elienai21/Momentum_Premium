"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildOrUpdateMemory = buildOrUpdateMemory;
const firebase_1 = require("../services/firebase");
async function buildOrUpdateMemory(tenantId, userId) {
    const txSnap = await firebase_1.db.collection(`tenants/${tenantId}/transactions`).limit(1000).get();
    let income = 0, expense = 0;
    const categories = {};
    txSnap.forEach((d) => {
        const t = d.data();
        const amt = Math.abs(Number(t.amount || 0));
        if (t.type === 'credit')
            income += amt;
        else
            expense += amt;
        if (t.category)
            categories[t.category] = (categories[t.category] || 0) + amt;
    });
    const total = income + expense || 1;
    const catArr = Object.entries(categories).map(([category, amount]) => ({ category, share: amount / total }))
        .sort((a, b) => b.share - a.share).slice(0, 5);
    const ratio = expense === 0 ? 1 : income / expense;
    const risk = ratio < 1 ? 'conservador' : (ratio < 1.2 ? 'moderado' : 'agressivo');
    const profile = {
        risk, avgMonthlyIncome: Number((income / 3).toFixed(2)), avgMonthlyExpense: Number((expense / 3).toFixed(2)),
        topCategories: catArr, updatedAt: new Date().toISOString()
    };
    await firebase_1.db.collection(`tenants/${tenantId}/ai_context`).doc('memory').set(profile, { merge: true });
    if (userId)
        await firebase_1.db.collection(`tenants/${tenantId}/users/${userId}/ai_context`).doc('memory').set(profile, { merge: true });
    return profile;
}
