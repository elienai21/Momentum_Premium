// functions/src/types/billing.ts
import type { PlanTier } from "../billing/creditsTypes";

export interface CreditsStateDTO {
  plan: PlanTier;
  available: number;
  monthlyQuota: number;
  used: number;
  renewsAt: string; // ISO
}

export interface BillingCreditsSuccessResponse {
  ok: true;
  data: CreditsStateDTO;
  traceId: string;
}

export interface BillingCreditsErrorResponse {
  ok: false;
  error: string;
  traceId: string;
}

export type BillingCreditsApiResponse =
  | BillingCreditsSuccessResponse
  | BillingCreditsErrorResponse;
