import { useEffect, useRef, useState } from "react";
import api from "@/services/api";

export interface MarketAdviceResponse {
  summary: string;
  marketFacts: string[];
  historicalPatterns: string[];
  risks: string[];
  opportunities: string[];
  consumerBehaviorInsights: string[];
  recommendedActions: string[];
}

export interface UseMarketAdviceOptions {
  question?: string;
  enabled?: boolean;
}

export interface UseMarketAdviceResult {
  data: MarketAdviceResponse | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  noCredits: boolean;
  /** Novo: conselheiro de mercado desativado para o tenant */
  marketDisabled: boolean;
}

export function useMarketAdvice(
  opts?: UseMarketAdviceOptions,
): UseMarketAdviceResult {
  const { question, enabled = true } = opts || {};

  const [data, setData] = useState<MarketAdviceResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [noCredits, setNoCredits] = useState(false);
  const [marketDisabled, setMarketDisabled] = useState(false);

  const lastQuestionRef = useRef<string | undefined>(question);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  async function load(customQuestion?: string) {
    if (!enabled) return;

    const payloadQuestion = customQuestion ?? lastQuestionRef.current;
    lastQuestionRef.current = payloadQuestion ?? undefined;

    setIsLoading(true);
    setError(null);
    setNoCredits(false);
    setMarketDisabled(false);

    try {
      const response = await api.post("/market/advice", {
        question: payloadQuestion,
      });

      if (!mountedRef.current) return;

      setData(response.data as MarketAdviceResponse);
    } catch (err: any) {
      if (!mountedRef.current) return;

      const status = err?.response?.status as number | undefined;
      const code = err?.response?.data?.code as string | undefined;

      if (status === 402 || code === "NO_CREDITS") {
        setNoCredits(true);
      } else if (status === 403 && code === "MARKET_DISABLED") {
        setMarketDisabled(true);
      } else if (status === 502 || code === "AI_PROVIDER_ERROR") {
        setError(
          new Error(
            "Serviço de IA indisponível no momento. Tente novamente mais tarde.",
          ),
        );
      } else {
        if (import.meta.env.DEV) {
          console.warn("[useMarketAdvice] erro ao obter análise de mercado:", err);
        }
        setError(
          err instanceof Error ? err : new Error("Erro ao obter análise de mercado"),
        );
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }

  // chamada automática inicial
  useEffect(() => {
    if (enabled) {
      load(question);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, question]);

  const refetch = () => {
    load();
  };

  return { data, isLoading, error, refetch, noCredits, marketDisabled };
}
