// web/src/hooks/useAlerts.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listAlerts, markAlertAsRead, AlertItem } from "../services/AlertsApi";

export function useAlerts() {
  const queryClient = useQueryClient();

  const alertsQuery = useQuery<AlertItem[]>({
    queryKey: ["alerts"],
    queryFn: listAlerts,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => markAlertAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
  });

  const unreadCount =
    alertsQuery.data?.filter((a) => a.status === "unread").length ?? 0;

  return {
    ...alertsQuery,
    unreadCount,
    markAsRead: markReadMutation.mutateAsync,
  };
}
