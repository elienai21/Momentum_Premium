// web/src/hooks/usePulseSummary.ts
import { useState, useEffect, useCallback } from "react";
import { doc, getDoc } from "firebase/firestore";
import { getPulseSummary, PulseSummary } from "../services/pulseApi";
import { useAuth } from "../context/AuthContext";
import { db } from "../services/firebase";

interface UsePulseSummaryParams {
  tenantId: string;
  periodStart: string;
  periodEnd: string;
}

export interface UsePulseSummaryResult {
  data: PulseSummary | null;
  loading: boolean;
  error: unknown | null;
  empty: boolean;
  refetch: () => void;
}

function isEmptyPulse(result: PulseSummary | null): boolean {
  if (!result) return true;
  if (!result.kpis) return true;

  const { cashBalance, revenueMonth, expenseMonth, runwayMonths } = result.kpis;
  const values = [cashBalance, revenueMonth, expenseMonth, runwayMonths];

  return values.every(
    (v) =>
      v === null ||
      v === undefined ||
      (typeof v === "number" && Math.abs(v) < 0.00001),
  );
}

function getHttpStatus(err: any): number | undefined {
  return (
    err?.response?.status ??
    err?.status ??
    err?.cause?.status ??
    err?.cause?.response?.status ??
    undefined
  );
}

function logPulseErrorDev(error: unknown) {
  if (!import.meta.env.DEV) return;

  const anyErr: any = error;
  const status = getHttpStatus(anyErr);
  const data = anyErr?.response?.data ?? anyErr?.data;

  // eslint-disable-next-line no-console
  console.warn("[Pulse] Erro ao obter resumo Pulse:", {
    status,
    data,
    error,
  });
}

export function usePulseSummary(
  params: UsePulseSummaryParams,
): UsePulseSummaryResult {
  const { tenantId, periodStart, periodEnd } = params;
  const { user } = useAuth();

  const [data, setData] = useState<PulseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown | null>(null);
  const [empty, setEmpty] = useState(false);
  const [version, setVersion] = useState(0);

  const refetch = useCallback(() => {
    setVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    if (!user) return;
    if (!tenantId) {
      setData(null);
      setEmpty(true);
      setLoading(false);
      return;
    }

    let active = true;

    async function fetchData() {
      setLoading(true);
      setError(null);
      setEmpty(false);

      try {
        const statsRef = doc(db, "tenants", tenantId, "stats", "financial_overview");
        const statsSnap = await getDoc(statsRef);

        if (statsSnap.exists()) {
          const stats = statsSnap.data() as any;
          const cached: PulseSummary = {
            tenantId,
            periodStart,
            periodEnd,
            kpis: {
              cashBalance: stats.balance ?? 0,
              revenueMonth: stats.totalRevenue ?? 0,
              expenseMonth: stats.totalExpenses ?? 0,
              runwayMonths: 0,
            },
            inflows: { total: 0, byCategory: {} },
            outflows: { total: 0, byCategory: {} },
            balanceSeries: [],
            accounts: [],
            alerts: [],
            projections: { runwayText: "" },
            sources: ["stats_cache"],
            meta: { traceId: "stats-cache", latency_ms: 0 },
          };

          if (!active) return;
          setData(cached);
          setEmpty(false);
          setLoading(false);
          return;
        }

        const result = await getPulseSummary({
          tenantId,
          periodStart,
          periodEnd,
        });

        if (!active) return;

        if (!result || isEmptyPulse(result)) {
          setData(null);
          setEmpty(true);
        } else {
          setData(result);
          setEmpty(false);
        }
      } catch (err: any) {
        if (!active) return;

        const status = getHttpStatus(err);

        if (status === 403 || status === 404) {
          setData(null);
          setError(null);
          setEmpty(true);

          if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.warn(`[PulseSummary] ${status} tratado como EMPTY para o tenant: ${tenantId}. Certifique-se que o backend está configurado.`);
          }
          return;
        }

        setError(err);
        setData(null);
        setEmpty(false);
        logPulseErrorDev(err);
      } finally {
        if (!active) return;
        setLoading(false);
      }
    }

    void fetchData();

    return () => {
      active = false;
    };
  }, [tenantId, periodStart, periodEnd, version, user]);

  return { data, loading, error, empty, refetch };
}
