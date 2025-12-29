"use strict";
// functions/src/billing/planNormalize.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizePlan = normalizePlan;
/**
 * Normaliza strings de planos vindas do banco/contexto para as tiers internas de crédito.
 */
function normalizePlan(plan) {
    const p = (plan || "free").toString().toLowerCase().trim();
    // Mapeamentos específicos
    if (p === "free" || p === "starter")
        return "starter";
    if (p === "pro")
        return "pro";
    if (p === "premium_lite")
        return "premium_lite";
    // CFO, Business, Enterprise e outros tiers "top" mapeiam para business
    if (p === "business" || p === "cfo" || p === "enterprise" || p === "premium_pro") {
        return "business";
    }
    // Fallback seguro
    return "starter";
}
