/* eslint-disable no-console */
import * as admin from "firebase-admin";

type Transaction = {
  amount?: number;
  date?: FirebaseFirestore.Timestamp | Date | string;
};

type Receivable = {
  amount?: number;
  amountPaid?: number;
  status?: string;
};

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function asDate(value: Transaction["date"]): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof (value as any)?.toDate === "function") return (value as any).toDate();
  if (typeof value === "string") return new Date(value);
  return null;
}

function ensureFirebase() {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  return admin.firestore();
}

async function computeTenantTotals(db: FirebaseFirestore.Firestore, tenantId: string) {
  const txSnap = await db.collection(`tenants/${tenantId}/transactions`).get();
  let totalIncome = 0;
  let totalExpenses = 0;
  let earliest: Date | null = null;

  txSnap.forEach((doc) => {
    const data = doc.data() as Transaction;
    const amount = typeof data.amount === "number" ? data.amount : 0;
    if (amount > 0) totalIncome += amount;
    if (amount < 0) totalExpenses += Math.abs(amount);

    const txDate = asDate(data.date);
    if (txDate && (!earliest || txDate < earliest)) {
      earliest = txDate;
    }
  });

  const receivablesSnap = await db
    .collection(`tenants/${tenantId}/receivables`)
    .where("status", "==", "overdue")
    .get();

  let totalOverdue = 0;
  let overdueCount = 0;
  receivablesSnap.forEach((doc) => {
    const data = doc.data() as Receivable;
    const amount = typeof data.amount === "number" ? data.amount : 0;
    const paid = typeof data.amountPaid === "number" ? data.amountPaid : 0;
    const outstanding = Math.max(0, amount - paid);
    if (outstanding > 0) {
      totalOverdue += outstanding;
      overdueCount += 1;
    }
  });

  return {
    totalIncome: round2(totalIncome),
    totalExpenses: round2(totalExpenses),
    totalOverdue: round2(totalOverdue),
    overdueCount,
    earliestDate: earliest,
    txCount: txSnap.size,
  };
}

async function backfillAnalytics() {
  const db = ensureFirebase();
  const tenantsSnap = await db.collection("tenants").get();
  console.log(`[START] backfillAnalytics — Tenants encontrados: ${tenantsSnap.size}`);

  for (const tenantDoc of tenantsSnap.docs) {
    const tenantId = tenantDoc.id;
    const totals = await computeTenantTotals(db, tenantId);

    const todayISO = new Date().toISOString().slice(0, 10);
    const periodStart = totals.earliestDate
      ? totals.earliestDate.toISOString().slice(0, 10)
      : todayISO;

    const netCash = round2(totals.totalIncome - totals.totalExpenses);
    const summaryDoc = {
      tenantId,
      period: { start: periodStart, end: todayISO },
      kpis: {
        cash_in: totals.totalIncome,
        cash_out: totals.totalExpenses,
        net_cash: netCash,
        opening_balance: 0,
        closing_balance: netCash,
        runway_days: null as number | null,
      },
      inflows: { total: totals.totalIncome, byCategory: {} as Record<string, number> },
      outflows: { total: totals.totalExpenses, byCategory: {} as Record<string, number> },
      balanceSeries: [] as Array<{ date: string; balance: number }>,
      projections: {
        runwayText: "Backfill de analytics executado para dados legados.",
      },
      receivables: {
        overdue_total: totals.totalOverdue,
        overdue_count: totals.overdueCount,
      },
      hasData: totals.txCount > 0,
      sources: ["backfill-script"],
      debugFsTxCount: totals.txCount,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.doc(`tenants/${tenantId}/pulseCache/last30`).set(summaryDoc, { merge: true });
    console.log(
      `[DONE] Tenant ${tenantId}: Income R$ ${totals.totalIncome.toFixed(2)} | ` +
        `Expense R$ ${totals.totalExpenses.toFixed(2)} | Overdue R$ ${totals.totalOverdue.toFixed(2)}`
    );
  }

  console.log("[COMPLETE] Backfill finalizado.");
}

if (require.main === module) {
  backfillAnalytics().catch((err) => {
    console.error("[ERROR] Backfill falhou", err);
    process.exit(1);
  });
}
