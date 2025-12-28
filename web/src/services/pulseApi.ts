// web/src/services/pulseApi.ts
import api from "./api";

// -------------------------------------------------------------
// Tipos de domínio usados no front (Pulse / Dashboard)
// -------------------------------------------------------------

export interface PulseSummaryKpis {
  cashBalance: number;
  revenueMonth: number;
  expenseMonth: number;
  runwayMonths: number;
  marginNet?: number;
}

export type PulseHealthStatus = "red" | "yellow" | "green";

export interface PulseHealth {
  status: PulseHealthStatus;
  reasons?: string[];
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

export interface PulseSummary {
  tenantId: string;
  periodStart: string;
  periodEnd: string;
  kpis: PulseSummaryKpis;
  inflows: { total: number; byCategory: Record<string, number> };
  outflows: { total: number; byCategory: Record<string, number> };
  balanceSeries: PulseDailyBalancePoint[];
  accounts: PulseAccountRow[];
  alerts: PulseAlertRow[];
  projections: { runwayText: string };
  insights?: string[];
  health?: PulseHealth;
  sources?: string[];
  meta?: {
    traceId: string;
    latency_ms: number;
  };
}

// -------------------------------------------------------------
// Helpers de Health Score
// -------------------------------------------------------------
function upgradeStatus(
  current: PulseHealthStatus,
  next: PulseHealthStatus
): PulseHealthStatus {
  if (next === "red") return "red";
  if (next === "yellow" && current === "green") return "yellow";
  return current;
}

export function computeHealthFromKpis(kpis: PulseSummaryKpis): PulseHealth {
  let status: PulseHealthStatus = "green";
  const reasons: string[] = [];

  // Runway
  if (kpis.runwayMonths < 2) {
    status = upgradeStatus(status, "red");
    reasons.push("Runway abaixo de 2 meses.");
  } else if (kpis.runwayMonths < 4) {
    status = upgradeStatus(status, "yellow");
    reasons.push("Runway entre 2 e 4 meses.");
  }

  // Margem líquida
  if (typeof kpis.marginNet === "number") {
    if (kpis.marginNet < 0) {
      status = upgradeStatus(status, "red");
      reasons.push("Margem líquida negativa.");
    } else if (kpis.marginNet < 0.1) {
      status = upgradeStatus(status, "yellow");
      reasons.push("Margem líquida abaixo do ideal.");
    }
  }

  // Resultado mensal
  if (kpis.expenseMonth > kpis.revenueMonth) {
    status = upgradeStatus(status, "yellow");
    reasons.push("Despesas maiores que a receita no período.");
  }

  return { status, reasons };
}

// -------------------------------------------------------------
// Tipos espelho da API /api/pulse/summary (backend)
// -------------------------------------------------------------

interface PulseSummaryApiKPIs {
  cash_in: number;
  cash_out: number;
  net_cash: number;
  opening_balance: number;
  closing_balance: number;
  runway_days: number | null;
}

interface PulseSummaryApiSuccess {
  ok: true;
  hasData: boolean;
  tenantId: string;
  period: { start: string; end: string };
  kpis: PulseSummaryApiKPIs;
  inflows: { total: number; byCategory: Record<string, number> };
  outflows: { total: number; byCategory: Record<string, number> };
  balanceSeries: PulseDailyBalancePoint[];
  accounts: PulseAccountRow[];
  alerts: PulseAlertRow[];
  projections: { runwayText: string };
  meta: {
    traceId: string;
    latency_ms: number;
    sources?: string[];
    debugFsTxCount?: number;
  };
}

interface PulseSummaryApiError {
  ok: false;
  error: string;
  traceId: string;
}

type PulseSummaryApiResponse = PulseSummaryApiSuccess | PulseSummaryApiError;

// -------------------------------------------------------------
// Função principal: chama backend e devolve view model do front
// -------------------------------------------------------------

export async function getPulseSummary(params: {
  tenantId: string;
  periodStart?: string;
  periodEnd?: string;
}): Promise<PulseSummary | null> {
  const { tenantId, periodStart, periodEnd } = params;

  const query: Record<string, string> = { tenantId };
  if (periodStart) query.start = periodStart;
  if (periodEnd) query.end = periodEnd;

  const { data } = await api.get<PulseSummaryApiResponse>("/pulse/summary", {
    params: query,
  });

  if (!data.ok) {
    // Erro vindo do backend
    const err = new Error(
      data.error || "Erro ao carregar resumo financeiro (Pulse)."
    );
    (err as any).traceId = data.traceId;
    throw err;
  }

  // Se o backend disser que não há dados, devolve null → Dashboard mostra EmptyState
  if (!data.hasData) {
    return null;
  }

  const { kpis, period, inflows, outflows, balanceSeries, accounts, alerts } =
    data;

  // Mapeia KPIs da API para o modelo do front
  const cashBalance = kpis.closing_balance;
  const revenueMonth = kpis.cash_in;
  const expenseMonth = kpis.cash_out;
  const netCash = kpis.net_cash;

  const runwayMonths =
    typeof kpis.runway_days === "number" && kpis.runway_days > 0
      ? kpis.runway_days / 30
      : 0;

  const marginNet =
    revenueMonth > 0 ? netCash / revenueMonth : undefined;

  const viewKpis: PulseSummaryKpis = {
    cashBalance,
    revenueMonth,
    expenseMonth,
    runwayMonths,
    marginNet,
  };

  const health = computeHealthFromKpis(viewKpis);
  const insights: string[] = [];

  if (health.status === "red") {
    insights.push(
      "Atenção: saúde financeira crítica. Revise custos fixos e fluxo de caixa imediatamente."
    );
  } else if (health.status === "yellow") {
    insights.push(
      "Alerta: indicadores exigem atenção. Monitore de perto despesas e entradas de caixa."
    );
  } else {
    insights.push("Saúde financeira estável neste período analisado.");
  }

  return {
    tenantId: data.tenantId,
    periodStart: period.start,
    periodEnd: period.end,
    kpis: viewKpis,
    inflows,
    outflows,
    balanceSeries,
    accounts,
    alerts,
    projections: data.projections,
    insights,
    health,
    sources: data.meta?.sources,
    meta: {
      traceId: data.meta.traceId,
      latency_ms: data.meta.latency_ms,
    },
  };
}

// -------------------------------------------------------------
// Tipos de simulação (mantidos como estavam)
// -------------------------------------------------------------

export interface SimulateParams {
  tenantId: string;
  period: {
    start: string;
    end: string;
  };
  levers: {
    advanceReceivables?: boolean;
    reduceSaaSPercent?: number;
    delayPayablesDays?: number;
  };
}

export interface SimulateResponse {
  baseline: {
    cash: number;
    runwayMonths: number;
    marginNet?: number;
  };
  scenario: {
    cash: number;
    runwayMonths: number;
    marginNet?: number;
  };
  deltas: {
    cash: number;
    runwayMonths: number;
    marginNet?: number;
  };
  actions?: Array<{ title: string; estSaving?: number }>;
}

/**
 * Envia parâmetros de simulação para o back-end e retorna os resultados.
 * Nota: a rota pode ser "/pulse/simulate" ou "/cfo/simulate" dependendo
 * de qual módulo do backend está ativo.
 */
export async function simulateScenario(
  params: SimulateParams
): Promise<SimulateResponse> {
  try {
    const { data } = await api.post<SimulateResponse>(
      "/pulse/simulate", // ou "/cfo/simulate" se o backend já foi migrado
      params
    );
    return data;
  } catch (err) {
    console.error("Erro ao simular cenário:", err);
    throw err;
  }
}
