// web/src/hooks/useMarketConfig.ts
import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import authorizedFetch from "@/services/authorizedFetch";

async function api<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await authorizedFetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export type Horizon = "30d" | "90d";

export type MarketConfig = {
  enabled: boolean;
  sector: string;
  region: string;
  companySize: string;
  horizon?: Horizon;
  updatedAt?: unknown;
  updatedBy?: string;
};

type ApiGetResp = { ok: true; data: MarketConfig };
type ApiPutResp = { ok: true; data: MarketConfig };

export function useMarketConfig(tenantId: string) {
  const qc = useQueryClient();
  const key = ["market-config", tenantId];

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const resp = await api<ApiGetResp>(
        `/api/admin/tenant/${tenantId}/market-config`,
      );
      return resp.data;
    },
    staleTime: 60_000,
  });

  const { mutateAsync: save, isPending: isSaving } = useMutation({
    mutationFn: async (payload: Partial<MarketConfig>) => {
      const resp = await api<ApiPutResp>(
        `/api/admin/tenant/${tenantId}/market-config`,
        {
          method: "PUT",
          body: JSON.stringify(payload),
        },
      );
      return resp.data;
    },
    onSuccess: (saved) => {
      qc.setQueryData(key, saved);
    },
  });

  const saveConfig = useCallback(
    async (patch: Partial<MarketConfig>) => {
      const current = data ?? {
        enabled: true,
        sector: "",
        region: "",
        companySize: "",
        horizon: "90d" as Horizon,
      };
      return save({ ...current, ...patch });
    },
    [data, save],
  );

  return {
    data,
    isLoading: isLoading || isFetching,
    error: error as Error | null,
    refetch,
    save: saveConfig,
    isSaving,
  };
}
