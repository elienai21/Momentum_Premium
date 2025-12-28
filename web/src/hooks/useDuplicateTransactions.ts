// web/src/hooks/useDuplicateTransactions.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  previewDuplicateTransactions,
  cleanupDuplicateTransactions,
  DuplicateTxnGroup,
} from "../services/DedupApi";

export function useDuplicateTransactions() {
  const queryClient = useQueryClient();

  const query = useQuery<{
    totalScanned: number;
    groups: DuplicateTxnGroup[];
  }>({
    queryKey: ["transactions", "duplicates"],
    queryFn: async () => {
      const res = await previewDuplicateTransactions();
      return {
        totalScanned: res.totalScanned,
        groups: res.groups,
      };
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const cleanupMutation = useMutation({
    mutationFn: (ids: string[]) => cleanupDuplicateTransactions(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["transactions", "duplicates"],
      });
    },
  });

  return {
    ...query,
    cleanup: cleanupMutation.mutateAsync,
    isCleaning: cleanupMutation.isPending,
  };
}