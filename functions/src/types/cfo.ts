// functions/src/types/cfo.ts
import type { ScenarioInput, ScenarioResult } from "../cfo/scenarioSimulator";

export type CfoSimulateRequest = ScenarioInput;

export interface CfoSimulateSuccessResponse {
  ok: true;
  tenantId: string;
  base: {
    income: number;
    expense: number;
  };
  /** Premissas efetivamente usadas na simulação */
  scenario: ScenarioInput;
  /** Resultado numérico da simulação */
  result: ScenarioResult;
  meta: {
    traceId: string;
  };
}

export interface CfoSimulateErrorResponse {
  ok: false;
  error: string;
  traceId: string;
}

export type CfoSimulateApiResponse =
  | CfoSimulateSuccessResponse
  | CfoSimulateErrorResponse;
