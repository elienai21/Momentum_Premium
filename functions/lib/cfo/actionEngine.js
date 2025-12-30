"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildActionPlan = buildActionPlan;
const firebase_1 = require("../services/firebase");
async function buildActionPlan(tenantId) {
    const memDoc = await firebase_1.db.collection(`tenants/${tenantId}/ai_context`).doc('memory').get();
    const mem = memDoc.data() || {};
    const recs = [];
    if (mem.topCategories?.length) {
        const top = mem.topCategories[0];
        recs.push({
            id: 'cut-top-cat-10',
            title: `Reduzir 10% em "${top.category}"`,
            reason: `Categoria responde por ${(top.share * 100).toFixed(1)}% dos gastos monitorados.`,
            impactBRL: Math.round((mem.avgMonthlyExpense || 0) * top.share * 0.10),
            category: top.category
        });
    }
    if ((mem.avgMonthlyIncome || 0) - (mem.avgMonthlyExpense || 0) < 0) {
        recs.push({
            id: 'create-cash-buffer',
            title: 'Criar reserva de caixa de 1.5× despesas',
            reason: 'Risco de liquidez identificado: despesas superando receitas.',
            impactBRL: Number(((mem.avgMonthlyExpense || 0) * 1.5).toFixed(0))
        });
    }
    const plan = { recommendations: recs, createdAt: new Date().toISOString() };
    await firebase_1.db.collection(`tenants/${tenantId}/ai_context`).doc('action_plan').set(plan, { merge: true });
    return plan;
}
