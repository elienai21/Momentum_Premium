import { useCallback, useEffect, useState } from "react";
import { api } from "../services/api";
import { useAuthToken } from "./useAuthToken";

export interface UsageLog {
    id: string;
    type: string;
    source: string;
    creditsConsumed: number;
    createdAt: string;
}

interface UseUsageLogsResult {
    logs: UsageLog[];
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
}

/**
 * Hook para buscar logs de uso de créditos de IA.
 */
export function useUsageLogs(limit = 10): UseUsageLogsResult {
    const auth = useAuthToken() as { token?: string | null } | null;
    const token = auth?.token ?? null;

    const [logs, setLogs] = useState<UsageLog[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const fetchLogs = useCallback(async () => {
        if (!token) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await api.get<{ logs: UsageLog[] }>(`/billing/usage-logs?limit=${limit}`);
            setLogs(response.data.logs || []);
        } catch (err: any) {
            if (import.meta.env.DEV) {
                console.warn("[useUsageLogs] erro ao carregar logs", err);
            }
            setError(err instanceof Error ? err : new Error("Erro ao carregar logs"));
        } finally {
            setIsLoading(false);
        }
    }, [token, limit]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    return { logs, isLoading, error, refetch: fetchLogs };
}
