// web/src/hooks/useRealEstatePayouts.ts
import { useEffect, useState, useCallback } from "react";
import {
  getRealEstatePayouts,
  RealEstatePayoutsResult,
} from "../services/realEstateApi";

interface UseRealEstateParams {
  tenantId: string;
  month?: string;
}

interface UseRealEstateResult {
  data: RealEstatePayoutsResult | null;
  loading: boolean;
  error: unknown | null;
  refetch: () => void;
}

export function useRealEstatePayouts(
  params: UseRealEstateParams,
): UseRealEstateResult {
  const { tenantId, month } = params;

  const [data, setData] = useState<RealEstatePayoutsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown | null>(null);
  const [version, setVersion] = useState(0);

  const refetch = useCallback(() => {
    setVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    let active = true;

    async function run() {
      setLoading(true);
      setError(null);

      try {
        const result = await getRealEstatePayouts({ tenantId, month });
        if (!active) return;
        setData(result);
      } catch (err) {
        if (!active) return;
        setError(err);
        setData(null);

        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.warn("[RealEstate] Erro ao carregar payouts:", err);
        }
      } finally {
        if (!active) return;
        setLoading(false);
      }
    }

    run();

    return () => {
      active = false;
    };
  }, [tenantId, month, version]);

  return { data, loading, error, refetch };
}
