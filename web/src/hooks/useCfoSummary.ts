// web/src/hooks/useCfoSummary.ts
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import { useAuthToken } from "./useAuthToken";

// Tipos flexíveis para não quebrar com pequenos ajustes do back
export interface CfoHealth {
  score: number;
  label?: string;
  summary?: string;
  trend?: "up" | "down" | "stable";
}

export interface CfoAction {
  id?: string;
  title: string;
  description?: string;
  status?: string;
  impact?: string;
  owner?: string;
  dueDate?: string;
}

export interface CfoScenario {
  id?: string;
  title: string;
  description?: string;
  impact?: string;
  tag?: string;
}

export interface CfoKpi {
  id?: string;
  name: string;
  value: number | string;
  unit?: string;
  trend?: "up" | "down" | "flat";
}

export interface CfoSummary {
  health?: CfoHealth;
  actions?: CfoAction[];
  scenarios?: CfoScenario[];
  kpis?: CfoKpi[];
  insights?: string[];
}

export function useCfoSummary() {
  const token = useAuthToken();

  const query = useQuery<CfoSummary>({
    queryKey: ["cfoSummary"],
    enabled: !!token, // só roda se tiver usuário logado
    queryFn: async () => {
      const res = await api.get<CfoSummary>("/cfo/summary");
      return res.data;
    },
  });

  const isEmpty =
    !query.isLoading &&
    !query.error &&
    (!query.data ||
      (!query.data.health &&
        (!query.data.actions || query.data.actions.length === 0) &&
        (!query.data.scenarios || query.data.scenarios.length === 0) &&
        (!query.data.kpis || query.data.kpis.length === 0)));

  return {
    data: query.data ?? null,
    error: (query.error as Error) ?? null,
    isLoading: query.isLoading || query.isFetching,
    isEmpty,
  };
}
