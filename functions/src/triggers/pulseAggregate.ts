// functions/src/triggers/pulseAggregate.ts
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { logger } from "../utils/logger";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Tipos internos reaproveitando a mesma lógica do Pulse
type Tx = {
  id: string;
  date: FirebaseFirestore.Timestamp | Date | string;
  amount: number;
  type?: "in" | "out";
  category?: string;
  status?: "paid" | "pending" | "overdue";
};

type SummaryKPIs = {
  cash_in: number;
  cash_out: number;
  net_cash: number;
  opening_balance: number;
  closing_balance: number;
  runway_days: number | null;
};

type DailyBalancePoint = {
  date: string; // YYYY-MM-DD
  balance: number;
};

type CachedSummaryDoc = {
  tenantId: string;
  period: { start: string; end: string };
  kpis: SummaryKPIs;
  inflows: { total: number; byCategory: Record<string, number> };
  outflows: { total: number; byCategory: Record<string, number> };
  balanceSeries: DailyBalancePoint[];
  projections: { runwayText: string };
  sources?: string[];
  hasData?: boolean;
  debugFsTxCount?: number;
  updatedAt?: FirebaseFirestore.Timestamp;
};

function asDate(
  v: FirebaseFirestore.Timestamp | Date | string | null | undefined
): Date {
  if (!v) return new Date();
  if (v instanceof Date) return v;
  if (typeof (v as any).toDate === "function") return (v as any).toDate();
  if (typeof v === "string") return new Date(v);
  return new Date();
}

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function objectRound2(rec: Record<string, number>) {
  return Object.fromEntries(
    Object.entries(rec).map(([k, v]) => [k, round2(v)])
  );
}

/**
 * 🧮 Trigger de agregação:
 * Sempre que um documento em tenants/{tenantId}/transactions/{txId} é criado/alterado/deletado,
 * recalculamos o resumo dos ÚLTIMOS 30 DIAS e salvamos em tenants/{tenantId}/pulseCache/last30.
 */
export const pulseAggregateOnWrite = onDocumentWritten(
  {
    document: "tenants/{tenantId}/transactions/{txId}",
    region: "southamerica-east1", // 👈 mesma região do apiV2/cfoNightly
  },
  async (event) => {
    const tenantId = event.params.tenantId as string | undefined;

    if (!tenantId) {
      logger.warn("[pulseAggregateOnWrite] tenantId ausente em params");
      return;
    }

    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 29);
    const end = now;

    const startISO = start.toISOString().slice(0, 10);
    const endISO = end.toISOString().slice(0, 10);

    try {
      const colPath = `tenants/${tenantId}/transactions`;
      const ref = db.collection(colPath);

      // Mantemos a mesma estratégia do Pulse: orderBy + limit e filtragem em memória.
      const snap = await ref.orderBy("date", "asc").limit(2000).get();

      if (snap.empty) {
        // Nenhuma transação → salvamos um cache vazio
        const emptyDoc: CachedSummaryDoc = {
          tenantId,
          period: { start: startISO, end: endISO },
          kpis: {
            cash_in: 0,
            cash_out: 0,
            net_cash: 0,
            opening_balance: 0,
            closing_balance: 0,
            runway_days: null,
          },
          inflows: { total: 0, byCategory: {} },
          outflows: { total: 0, byCategory: {} },
          balanceSeries: [],
          projections: {
            runwayText: "Runway não disponível com os dados atuais.",
          },
          sources: ["firestore"],
          hasData: false,
          debugFsTxCount: 0,
        };

        await db
          .doc(`tenants/${tenantId}/pulseCache/last30`)
          .set(
            {
              ...emptyDoc,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );

        logger.info("[pulseAggregateOnWrite] Cache vazio atualizado", {
          tenantId,
          colPath,
        });
        return;
      }

      const allTxs: Tx[] = snap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          date:
            data.date ??
            data.dueDate ??
            data.createdAt ??
            new Date().toISOString(),
          amount: Number(data.amount ?? data.value ?? 0),
          type: data.type,
          category: data.category || data.group || data.tag,
          status: data.status,
        };
      });

      // Filtra pelo período (últimos 30 dias)
      const filtered = allTxs.filter((tx) => {
        const d = asDate(tx.date);
        return d >= start && d <= end;
      });

      let cashIn = 0;
      let cashOut = 0;
      const inflowByCat: Record<string, number> = {};
      const outflowByCat: Record<string, number> = {};
      const dailyBalance: Record<string, number> = {};

      const openingBalance = 0;
      let balance = openingBalance;

      for (const tx of filtered) {
        const d = asDate(tx.date);
        const dayKey = d.toISOString().slice(0, 10);
        const rawAmount = typeof tx.amount === "number" ? tx.amount : 0;

        const isOut = rawAmount < 0 || tx.type === "out";
        const amt = Math.abs(rawAmount);
        const cat = tx.category || "Outros";

        if (isOut) {
          cashOut += amt;
          outflowByCat[cat] = (outflowByCat[cat] ?? 0) + amt;
          balance -= amt;
        } else {
          cashIn += amt;
          inflowByCat[cat] = (inflowByCat[cat] ?? 0) + amt;
          balance += amt;
        }

        dailyBalance[dayKey] = balance;
      }

      const closingBalance = balance;
      const netCash = cashIn - cashOut;

      let runway_days: number | null = null;
      if (netCash < 0 && closingBalance > 0) {
        const days = Math.max(1, Object.keys(dailyBalance).length || 30);
        const avgBurn = Math.abs(netCash) / days;
        runway_days = avgBurn > 0 ? closingBalance / avgBurn : null;
      }

      const kpis: SummaryKPIs = {
        cash_in: round2(cashIn),
        cash_out: round2(cashOut),
        net_cash: round2(netCash),
        opening_balance: round2(openingBalance),
        closing_balance: round2(closingBalance),
        runway_days: runway_days ? round2(runway_days) : null,
      };

      const balanceSeries: DailyBalancePoint[] = Object.entries(dailyBalance)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([date, value]) => ({ date, balance: round2(value) }));

      const sources: string[] = filtered.length ? ["firestore"] : [];

      const doc: CachedSummaryDoc = {
        tenantId,
        period: { start: startISO, end: endISO },
        kpis,
        inflows: {
          total: round2(cashIn),
          byCategory: objectRound2(inflowByCat),
        },
        outflows: {
          total: round2(cashOut),
          byCategory: objectRound2(outflowByCat),
        },
        balanceSeries,
        projections: {
          runwayText:
            runway_days && runway_days > 0
              ? `Runway estimado de aproximadamente ${Math.round(
                  runway_days
                )} dias com o saldo atual.`
              : "Runway não disponível com os dados atuais.",
        },
        sources,
        hasData: filtered.length > 0,
        debugFsTxCount: filtered.length,
      };

      await db
        .doc(`tenants/${tenantId}/pulseCache/last30`)
        .set(
          {
            ...doc,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

      logger.info("[pulseAggregateOnWrite] Cache last30 atualizado", {
        tenantId,
        txCount: filtered.length,
      });
    } catch (err: any) {
      logger.error("[pulseAggregateOnWrite] erro ao agregar Pulse", {
        tenantId,
        error: err?.message,
        stack: err?.stack,
      });
    }
  }
);
