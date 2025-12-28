// functions/src/types/pulseApi.ts

export interface PulseSummaryKPIs {
  cash_in: number;
  cash_out: number;
  net_cash: number;
  opening_balance: number;
  closing_balance: number;
  runway_days: number | null;
}

export interface PulseDailyBalancePoint {
  date: string; // YYYY-MM-DD
  balance: number;
}

export interface PulseAccountRow {
  id: string;
  name: string;
  dueDate?: string | null;
  amount?: number;
  status?: string;
  type?: string;
}

export interface PulseAlertRow {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  read?: boolean;
}

export interface PulseSummarySuccessResponse {
  ok: true;
  hasData: boolean;
  tenantId: string;
  period: { start: string; end: string };
  kpis: PulseSummaryKPIs;
  inflows: { total: number; byCategory: Record<string, number> };
  outflows: { total: number; byCategory: Record<string, number> };
  balanceSeries: PulseDailyBalancePoint[];
  accounts: PulseAccountRow[];
  alerts: PulseAlertRow[];
  projections: { runwayText: string };
  meta: {
    traceId: string;
    latency_ms: number;
    /**
     * Fontes de dados consideradas para montar o Pulse.
     * Ex.: ["firestore"] ou ["firestore", "realcore"]
     */
    sources?: string[];
    /**
     * Campo opcional de debug: número de transações vindas do Firestore.
     */
    debugFsTxCount?: number;
  };
}

export interface PulseSummaryErrorResponse {
  ok: false;
  error: string;
  traceId: string;
}

export type PulseSummaryApiResponse =
  | PulseSummarySuccessResponse
  | PulseSummaryErrorResponse;
