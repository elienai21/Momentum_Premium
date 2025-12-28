// web/src/hooks/usePulseSummary.ts
import { useState, useEffect, useCallback } from "react";
import { getPulseSummary, PulseSummary } from "../services/pulseApi";
import { useAuth } from "../context/AuthContext";

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

function logPulseErrorDev(error: unknown) {
  if (!import.meta.env.DEV) return;

  const anyErr: any = error;
  const status = anyErr?.response?.status ?? anyErr?.status;
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
        const result = await getPulseSummary({
          tenantId,
          periodStart,
          periodEnd,
        });

        if (!active) return;

        // getPulseSummary já retorna null quando o backend diz "hasData: false"
        if (!result || isEmptyPulse(result)) {
          setData(null);
          setEmpty(true);
        } else {
          setData(result);
          setEmpty(false);
        }
      } catch (err: any) {
        if (!active) return;

        const status =
          err?.response?.status ??
          err?.status ??
          err?.cause?.status ??
          undefined;

        // 404 → tratamos como "sem dados", se algum dia o backend usar isso
        if (status === 404) {
          setData(null);
          setError(null);
          setEmpty(true);

          if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.warn("[Pulse] 404 → tratado como EMPTY");
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
