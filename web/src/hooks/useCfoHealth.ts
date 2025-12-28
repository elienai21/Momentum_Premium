// web/src/hooks/useCfoHealth.ts
import { useQuery } from "@tanstack/react-query";
import { CfoApi, HealthScore } from "../services/CfoApi";

/**
 * Hook para buscar o Health Score do CFO.
 * Usa React Query, com cache e refresh leve.
 */
export function useCfoHealth() {
  return useQuery<HealthScore>({
    queryKey: ["cfo-health"],
    queryFn: () => CfoApi.getHealth(),
    staleTime: 60_000, // 1 minuto
    refetchOnWindowFocus: false,
  });
}
