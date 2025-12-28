import { db } from "src/services/firebase";

import * as admin from 'firebase-admin';

export type MemoryProfile = {
  risk: 'conservador' | 'moderado' | 'agressivo';
  avgMonthlyIncome: number;
  avgMonthlyExpense: number;
  topCategories: { category: string; share: number }[];
  updatedAt: string;
};

export async function buildOrUpdateMemory(tenantId: string, userId?: string): Promise<MemoryProfile> {
  const txSnap = await db.collection(`tenants/${tenantId}/transactions`).limit(1000).get();
  let income = 0, expense = 0;
  const categories: Record<string, number> = {};
  txSnap.forEach((d: any) => {
    const t = d.data();
    const amt = Math.abs(Number(t.amount || 0));
    if (t.type === 'credit') income += amt; else expense += amt;
    if (t.category) categories[t.category] = (categories[t.category] || 0) + amt;
  });
  const total = income + expense || 1;
  const catArr = Object.entries(categories).map(([category, amount]) => ({ category, share: amount / total }))
                   .sort((a,b)=>b.share - a.share).slice(0,5);

  const ratio = expense === 0 ? 1 : income/expense;
  const risk: MemoryProfile['risk'] = ratio < 1 ? 'conservador' : (ratio < 1.2 ? 'moderado' : 'agressivo');

  const profile: MemoryProfile = {
    risk, avgMonthlyIncome: Number((income/3).toFixed(2)), avgMonthlyExpense: Number((expense/3).toFixed(2)),
    topCategories: catArr, updatedAt: new Date().toISOString()
  };
  await db.collection(`tenants/${tenantId}/ai_context`).doc('memory').set(profile, { merge: true });
  if (userId) await db.collection(`tenants/${tenantId}/users/${userId}/ai_context`).doc('memory').set(profile, { merge: true });
  return profile;
}



