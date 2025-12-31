import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { logger } from "../utils/logger";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const { FieldValue } = admin.firestore;

type TxDoc = {
  amount?: number;
  value?: number;
  type?: "in" | "out";
};

function parseContribution(data: TxDoc | undefined): { revenue: number; expenses: number } {
  if (!data) return { revenue: 0, expenses: 0 };
  const rawAmount = Number(data.amount ?? data.value ?? 0);
  const isOut = data.type === "out" || rawAmount < 0;
  const magnitude = Math.abs(rawAmount);
  return isOut
    ? { revenue: 0, expenses: magnitude }
    : { revenue: magnitude, expenses: 0 };
}

export const analyticsAggregator = onDocumentWritten(
  {
    document: "tenants/{tenantId}/transactions/{txId}",
    region: "southamerica-east1",
  },
  async (event) => {
    const tenantId = event.params.tenantId as string | undefined;
    if (!tenantId) {
      logger.warn("[analyticsAggregator] missing tenantId in params");
      return;
    }

    const before = parseContribution(event.data?.before?.data() as TxDoc | undefined);
    const after = parseContribution(event.data?.after?.data() as TxDoc | undefined);

    const deltaRevenue = after.revenue - before.revenue;
    const deltaExpenses = after.expenses - before.expenses;
    const deltaCount = (event.data?.after.exists ? 1 : 0) - (event.data?.before.exists ? 1 : 0);
    const deltaBalance = deltaRevenue - deltaExpenses;

    const statsRef = db.doc(`tenants/${tenantId}/stats/financial_overview`);

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(statsRef);
      const exists = snap.exists;

      const payload: Record<string, any> = {
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

      tx.set(
        statsRef,
        {
          totalRevenue: payload.totalRevenue,
          totalExpenses: payload.totalExpenses,
          balance: payload.balance,
          transactionCount: payload.transactionCount,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });

    logger.info("[analyticsAggregator] Stats updated", {
      tenantId,
      deltaRevenue,
      deltaExpenses,
      deltaCount,
    });
  }
);
