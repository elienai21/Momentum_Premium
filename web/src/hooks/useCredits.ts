import { useCallback, useEffect, useState } from "react";
import { api } from "../services/api";
import { useAuthToken } from "./useAuthToken";

export interface CreditsInfo {
  available: number;
  monthlyQuota: number;
  used: number;
  renewsAt: string;
}

interface UseCreditsResult {
  credits: CreditsInfo | null;
  isLoading: boolean;
  error: Error | null;
  noCredits: boolean;
  refetch: () => void;
}

/**
 * Hook para buscar créditos de IA/voz do tenant logado.
 *
 * - Não quebra caso ainda não haja usuário autenticado (useAuthToken retorna null)
 * - Só tenta buscar quando houver token
 * - Em erro, não explode a UI; apenas preenche `error` e faz log em DEV
 */
export function useCredits(): UseCreditsResult {
  // useAuthToken pode retornar null no primeiro render
  const auth = useAuthToken() as { token?: string | null } | null;
  const token = auth?.token ?? null;

  const [credits, setCredits] = useState<CreditsInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchCredits = useCallback(async () => {
    // Sem token ainda: não tenta chamar a API.
    // O efeito será disparado de novo quando o token for atualizado.
    if (!token) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.get<CreditsInfo>("/billing/credits");
      setCredits(response.data);
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.warn("[useCredits] erro ao carregar créditos", err);
      }
      setError(err instanceof Error ? err : new Error("Erro ao carregar créditos"));
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  const noCredits = credits ? credits.available <= 0 : false;

  return {
    credits,
    isLoading,
    error,
    noCredits,
    refetch: fetchCredits,
  };
}
