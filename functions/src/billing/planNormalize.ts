// functions/src/billing/planNormalize.ts

export type NormalizedPlan = "starter" | "pro" | "premium_lite" | "business";

/**
 * Normaliza strings de planos vindas do banco/contexto para as tiers internas de crédito.
 */
export function normalizePlan(plan: string | undefined | null): NormalizedPlan {
    const p = (plan || "free").toString().toLowerCase().trim();

    // Mapeamentos específicos
    if (p === "free" || p === "starter") return "starter";
    if (p === "pro") return "pro";
    if (p === "premium_lite") return "premium_lite";

    // CFO, Business, Enterprise e outros tiers "top" mapeiam para business
    if (p === "business" || p === "cfo" || p === "enterprise" || p === "premium_pro") {
        return "business";
    }

    // Fallback seguro
    return "starter";
}
