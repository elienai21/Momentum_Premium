// web/src/hooks/useDedup.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  previewDuplicateTransactions,
  cleanupDuplicateTransactions,
  DuplicateTxnGroup,
} from "../services/DedupApi";

export function useDedupPreview() {
  const query = useQuery({
    queryKey: ["dedup-preview"],
    queryFn: previewDuplicateTransactions,
    staleTime: 60_000, // 1 min
    refetchOnWindowFocus: false,
  });

  const groups: DuplicateTxnGroup[] = query.data?.groups ?? [];
  const totalScanned = query.data?.totalScanned ?? 0;

  // Quantidade de "duplicados a mais" (ex.: grupo de 3 => 2 duplicadas)
  const totalExtraDuplicates = groups.reduce(
    (acc, g) => acc + Math.max(0, g.count - 1),
    0,
  );

  return {
    ...query,
    groups,
    totalScanned,
    totalExtraDuplicates,
  };
}

export function useDedupCleanup() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (deleteIds: string[]) => cleanupDuplicateTransactions(deleteIds),
    onSuccess: () => {
      // Recarrega a prévia de duplicados
      queryClient.invalidateQueries({ queryKey: ["dedup-preview"] });
      // E, se você tiver uma query de transações, invalidar também:
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  return mutation;
}
