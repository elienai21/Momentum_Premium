"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chargeCredits = chargeCredits;
// functions/src/billing/chargeCredits.ts
const credits_1 = require("../config/credits");
const creditsService_1 = require("./creditsService");
/**
 * Wrapper transacional e idempotente para cobrar créditos de IA.
 *
 * @param params Parâmetros de cobrança
 * @param handler A função que executa a operação de IA (ex.: chamada OpenAI)
 * @returns O resultado do handler
 */
async function chargeCredits(params, handler) {
    const { tenantId, plan, featureKey, idempotencyKey, traceId } = params;
    const cost = params.cost ?? credits_1.CREDIT_COSTS[featureKey] ?? 0;
    // 1. Valida créditos antes de iniciar (fail fast)
    await (0, creditsService_1.ensureCreditsOrThrow)(tenantId, cost, featureKey, plan);
    // 2. Executa a operação real de IA
    const result = await handler();
    // 3. Consome os créditos após o sucesso
    // Usamos traceId + featureKey como fallback de idempotencyKey se não fornecido
    const usageLogId = idempotencyKey || (traceId ? `${traceId}:${featureKey}` : undefined);
    await (0, creditsService_1.consumeCredits)(tenantId, cost, {
        type: featureKey,
        source: "ai_charge_wrapper",
        usageLogId
    });
    return result;
}
