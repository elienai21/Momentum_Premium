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
      // 1. Reset explicit no início (evita "sticky state")
      setLoading(true);
      setError(null);
      setEmpty(false);
      // setData(null); // Opcional: manter o dado anterior enquanto carrega ou limpar? 
      // User sugeriu reset explícito, vamos seguir o padrão seguro.

      try {
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

        // 403 ou 404 → tratamos como "sem dados" com observabilidade em DEV
        if (status === 403 || status === 404) {
          setData(null);
          setError(null); // Não propagamos erro para UI nesses casos
          setEmpty(true);

          if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.warn(`[PulseSummary] ${status} tratado como EMPTY para o tenant: ${tenantId}. Certifique-se que o backend está configurado.`);
          }
          return;
        }

        // Outros erros (500, timeout, etc)
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
