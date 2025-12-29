// functions/src/billing/chargeCredits.ts
import { CreditFeatureKey, CREDIT_COSTS } from "../config/credits";
import { consumeCredits, ensureCreditsOrThrow } from "./creditsService";
import { PlanTier } from "./creditsTypes";

export interface ChargeCreditsParams {
    tenantId: string;
    plan: PlanTier;
    featureKey: CreditFeatureKey;
    cost?: number; // Permite override se necessário
    idempotencyKey?: string;
    traceId?: string;
}

/**
 * Wrapper transacional e idempotente para cobrar créditos de IA.
 * 
 * @param params Parâmetros de cobrança
 * @param handler A função que executa a operação de IA (ex.: chamada OpenAI)
 * @returns O resultado do handler
 */
export async function chargeCredits<T>(
    params: ChargeCreditsParams,
    handler: () => Promise<T>
): Promise<T> {
    const { tenantId, plan, featureKey, idempotencyKey, traceId } = params;
    const cost = params.cost ?? CREDIT_COSTS[featureKey] ?? 0;

    // 1. Valida créditos antes de iniciar (fail fast)
    await ensureCreditsOrThrow(tenantId, cost, featureKey, plan);

    // 2. Executa a operação real de IA
    const result = await handler();

    // 3. Consome os créditos após o sucesso
    // Usamos traceId + featureKey como fallback de idempotencyKey se não fornecido
    const usageLogId = idempotencyKey || (traceId ? `${traceId}:${featureKey}` : undefined);

    await consumeCredits(tenantId, cost, {
        type: featureKey,
        source: "ai_charge_wrapper",
        usageLogId
    });

    return result;
}
