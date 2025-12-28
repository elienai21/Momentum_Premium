// web/src/services/AlertsApi.ts
import { api } from "./api";

export type AlertSeverity = "low" | "medium" | "high";

export interface AlertItem {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  status: "unread" | "read";
  dateKey: string; // YYYY-MM-DD
  createdAt: string;
  metadata?: Record<string, unknown>;
}

interface AlertsListResponse {
  status: "ok";
  items: AlertItem[];
}

/**
 * GET /api/alerts
 * Lista alertas do tenant atual.
 * Em caso de erro (ex.: API offline, emulador parado) retorna [] para não quebrar a UI.
 */
export async function listAlerts(): Promise<AlertItem[]> {
  try {
    const { data } = await api.get<AlertsListResponse>("/alerts");

    if (!data || data.status !== "ok") {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.warn("[AlertsApi] resposta inesperada:", data);
      }
      return [];
    }

    return data.items || [];
  } catch (err) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn("[AlertsApi] erro ao buscar alerts (ignorado):", err);
    }
    // Blindagem: em erro, só devolve lista vazia
    return [];
  }
}

/**
 * POST /api/alerts/:id/read
 * Marca um alerta como lido.
 * Se falhar, apenas loga em dev e segue a vida.
 */
export async function markAlertAsRead(id: string): Promise<void> {
  try {
    await api.post(`/alerts/${id}/read`);
  } catch (err) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn("[AlertsApi] erro ao marcar alerta como lido (ignorado):", {
        id,
        err,
      });
    }
    // Não lança erro para não quebrar interação do usuário
  }
}
