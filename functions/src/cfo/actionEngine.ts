import { db } from "src/services/firebase";

import * as admin from 'firebase-admin';

export type Recommendation = { id: string; title: string; reason: string; impactBRL?: number; category?: string; };
export type ActionPlan = { recommendations: Recommendation[]; createdAt: string };

export async function buildActionPlan(tenantId: string): Promise<ActionPlan> {
  const memDoc = await db.collection(`tenants/${tenantId}/ai_context`).doc('memory').get();
  const mem = memDoc.data() as any || {};
  const recs: Recommendation[] = [];

  if (mem.topCategories?.length) {
    const top = mem.topCategories[0];
    recs.push({
      id: 'cut-top-cat-10',
      title: `Reduzir 10% em "${top.category}"`,
      reason: `Categoria responde por ${(top.share*100).toFixed(1)}% dos gastos monitorados.`,
      impactBRL: Math.round((mem.avgMonthlyExpense||0) * top.share * 0.10),
      category: top.category
    });
  }
  if ((mem.avgMonthlyIncome||0) - (mem.avgMonthlyExpense||0) < 0) {
    recs.push({
      id: 'create-cash-buffer',
      title: 'Criar reserva de caixa de 1.5× despesas',
      reason: 'Risco de liquidez identificado: despesas superando receitas.',
      impactBRL: Number(((mem.avgMonthlyExpense||0)*1.5).toFixed(0))
    });
  }
  const plan: ActionPlan = { recommendations: recs, createdAt: new Date().toISOString() };
  await db.collection(`tenants/${tenantId}/ai_context`).doc('action_plan').set(plan, { merge: true });
  return plan;
}



