import { db } from "src/services/firebase";

import * as admin from 'firebase-admin';

export async function getBenchmarks(vertical: string) {
  return {
    vertical,
    averages: { expenseToIncome: 0.72, payrollShare: 0.28, marketingShare: 0.12 },
    updatedAt: new Date().toISOString()
  };
}

export async function compareToBenchmark(tenantId: string, vertical: string) {
  const memDoc = await db.collection(`tenants/${tenantId}/ai_context`).doc('memory').get();
  const mem = memDoc.data() as any || { avgMonthlyIncome:0, avgMonthlyExpense:0 };
  const bm = await getBenchmarks(vertical);
  const expenseToIncome = (mem.avgMonthlyExpense||0) / ((mem.avgMonthlyIncome||1));
  return { benchmark: bm, tenant: { expenseToIncome } };
}



