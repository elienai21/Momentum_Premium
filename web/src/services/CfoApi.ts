// web/src/services/CfoApi.ts
import { api } from "./api";

// ==========================
// HEALTH SCORE DO CFO
// ==========================

export type CfoHealthStatus = "EXCELLENT" | "STABLE" | "CRITICAL" | "DANGER";

export interface CfoHealthMetrics {
  cashFlowRatio: number;
  marginRatio: number;
  debtRatio: number;
}

export interface CfoHealth {
  score: number;
  status: CfoHealthStatus;
  aiComment: string;
  metrics: CfoHealthMetrics;
  runwayMonths: number;
  updatedAt: string;
}

interface CfoHealthApiResponse {
  status: "ok";
  tenantId: string;
  health: CfoHealth;
}

/**
 * GET /api/cfo/health
 * Busca o Health Score do CFO para o tenant atual.
 */
export async function getCfoHealth(): Promise<CfoHealth> {
  const { data } = await api.get<CfoHealthApiResponse>("/cfo/health");

  if (!data.health) {
    throw new Error("Resposta da API de CFO sem campo health.");
  }

  return data.health;
}

// ==========================
// SIMULAÇÃO SIMPLES
// ==========================

export interface SimpleSimulationInput {
  incDeltaPct?: number; // ex: 10 para +10%
  expDeltaPct?: number; // ex: -5 para -5%
  oneOffIncome?: number; // ex: 10000
  oneOffExpense?: number; // ex: 5000
}

export interface SimpleSimulationResponse {
  ok: boolean;
  base: {
    income: number;
    expense: number;
  };
  result: {
    newIncome: number;
    newExpense: number;
    net: number;
  };
  monthlyProjection?: Array<{ month: number; balance: number }>;
}

// ==========================
// SIMULAÇÃO AVANÇADA
// ==========================

export interface AdvancedSimulationInput {
  recurringExpensesDelta: number; // R$
  growthRateIncome: number;       // 0.1 para 10%
  oneTimeExpense: number;         // R$
}

export interface AdvancedSimulationResponse {
  ok: boolean;
  baseline: {
    avgIncome: number;
    avgExpense: number;
    runwayMonths: number;
  };
  projected: {
    avgIncome: number;
    avgExpense: number;
    runwayMonths: number;
    netCashFlow: number;
  };
  deltas: {
    runwayImpact: number;
    cashImpact: number;
  };
  monthlyProjection: Array<{ month: number; balance: number }>;
}

// ==========================
// RELATÓRIO IA DO CFO
// ==========================

export interface CfoAiReportMeta {
  periodDays: number;
  generatedAt: string;
  model?: string;
}

export interface CfoAiReportResult {
  report: string;
  meta?: CfoAiReportMeta;
}

interface CfoAiReportApiResponse {
  status: "ok";
  report: string;
  meta?: CfoAiReportMeta;
}

// ==========================
// API AGREGADA
// ==========================

export const CfoApi = {
  getHealth: getCfoHealth,

  /**
   * Simulação Rápida: Ajustes percentuais e pontuais.
   * POST /api/cfo/simulate
   */
  simulate: async (
    input: SimpleSimulationInput
  ): Promise<SimpleSimulationResponse> => {
    const { data } = await api.post<SimpleSimulationResponse>(
      "/cfo/simulate",
      input
    );
    return data;
  },

  /**
   * Simulação Avançada: Cenários complexos de crescimento e custos recorrentes.
   * POST /api/cfo/simulate/advanced
   */
  simulateAdvanced: async (
    input: AdvancedSimulationInput
  ): Promise<AdvancedSimulationResponse> => {
    const { data } = await api.post<AdvancedSimulationResponse>(
      "/cfo/simulate/advanced",
      input
    );
    return data;
  },

  /**
   * Relatório IA do CFO (texto longo com visão de período)
   * POST /api/cfo/ai-report
   */
  getAiReport: async (
    periodDays?: number
  ): Promise<CfoAiReportResult> => {
    const body =
      typeof periodDays === "number" && periodDays > 0
        ? { periodDays }
        : {};

    const { data } = await api.post<CfoAiReportApiResponse>(
      "/cfo/ai-report",
      body
    );

    if (data.status !== "ok") {
      throw new Error("Falha ao gerar relatório do CFO IA.");
    }

    return {
      report: data.report,
      meta: data.meta,
    };
  },
};
