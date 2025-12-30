"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maybeResetMonthlyCredits = maybeResetMonthlyCredits;
exports.getCredits = getCredits;
exports.consumeCredits = consumeCredits;
exports.ensureCreditsOrThrow = ensureCreditsOrThrow;
// functions/src/billing/creditsService.ts
const firebase_1 = require("src/services/firebase");
const errors_1 = require("../utils/errors");
const planNormalize_1 = require("./planNormalize");
function resolveMonthlyCreditsForPlan(plan) {
    const normalized = (0, planNormalize_1.normalizePlan)(plan);
    if (normalized === "pro")
        return 2000;
    if (normalized === "premium_lite")
        return 1000;
    if (normalized === "business")
        return 5000;
    return 300; // starter/default
}
function nowISO() {
    return new Date().toISOString();
}
/**
 * Inicializa ou normaliza o bloco de créditos de um tenant.
 */
async function initCreditsIfNeeded(tenantId, plan) {
    const ref = firebase_1.db.collection("tenants").doc(tenantId);
    let result = null;
    await firebase_1.db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const data = snap.data() || {};
        const existing = data.credits;
        const monthlyQuota = resolveMonthlyCreditsForPlan(plan);
        if (!existing) {
            const created = {
                available: monthlyQuota,
                monthlyQuota,
                lastResetAt: nowISO(),
                updatedAt: nowISO(),
            };
            tx.set(ref, { credits: created }, { merge: true });
            result = created;
            return;
        }
        // normaliza campos
        const normalized = {
            available: typeof existing.available === "number" ? existing.available : monthlyQuota,
            monthlyQuota: typeof existing.monthlyQuota === "number"
                ? existing.monthlyQuota
                : monthlyQuota,
            lastResetAt: existing.lastResetAt ?? nowISO(),
            updatedAt: existing.updatedAt ?? nowISO(),
        };
        // garante que monthlyQuota bate com o plano atual
        if (normalized.monthlyQuota !== monthlyQuota) {
            normalized.monthlyQuota = monthlyQuota;
            if (normalized.available > monthlyQuota) {
                normalized.available = monthlyQuota;
            }
        }
        tx.set(ref, { credits: normalized }, { merge: true });
        result = normalized;
    });
    return result;
}
/**
 * Verifica se é hora de resetar créditos mensais.
 * Prioriza o ciclo do Stripe (tenant.billing.currentPeriodEnd).
 * Fallback: 30 dias desde lastResetAt.
 */
async function maybeResetMonthlyCredits(tenantId, plan) {
    const ref = firebase_1.db.collection("tenants").doc(tenantId);
    const now = nowISO();
    const monthlyQuota = resolveMonthlyCreditsForPlan(plan);
    let out = null;
    await firebase_1.db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const data = snap.data() || {};
        const existing = data.credits;
        const billing = data.billing || {};
        // 1. Determina a data de renovação (renewsAt)
        const stripeEnd = billing.currentPeriodEnd;
        let renewsAt;
        if (stripeEnd) {
            renewsAt = stripeEnd;
        }
        else {
            const lastReset = existing?.lastResetAt ?? now;
            const d = new Date(lastReset);
            d.setDate(d.getDate() + 30);
            renewsAt = d.toISOString();
        }
        const isExpired = new Date(now) >= new Date(renewsAt);
        const quotaChanged = existing && existing.monthlyQuota !== monthlyQuota;
        if (!existing || isExpired || quotaChanged) {
            // Se era por expiração do Stripe, o novo lastResetAt deve ser o currentPeriodStart se disponível
            const newLastReset = (isExpired && billing.currentPeriodStart) ? billing.currentPeriodStart : now;
            const reset = {
                available: monthlyQuota,
                monthlyQuota,
                lastResetAt: newLastReset,
                updatedAt: now,
            };
            tx.set(ref, { credits: reset }, { merge: true });
            out = reset;
        }
        else {
            out = {
                available: typeof existing.available === "number" ? existing.available : 0,
                monthlyQuota: existing?.monthlyQuota ?? monthlyQuota,
                lastResetAt: existing?.lastResetAt ?? now,
                updatedAt: existing?.updatedAt,
            };
        }
    });
    return out;
}
/**
 * Retorna o estado de créditos para exibição no front.
 */
async function getCredits(tenantId, plan) {
    const ref = firebase_1.db.collection("tenants").doc(tenantId);
    const now = nowISO();
    const monthlyQuota = resolveMonthlyCreditsForPlan(plan);
    const snap = await ref.get();
    const data = snap.data() || {};
    const existing = data.credits;
    const billing = data.billing || {};
    const base = existing ?? {
        available: monthlyQuota,
        monthlyQuota,
        lastResetAt: now,
        updatedAt: now,
    };
    const available = typeof base.available === "number" ? base.available : monthlyQuota;
    const used = Math.max(0, monthlyQuota - available);
    let renewsAt = base.lastResetAt ?? now;
    let periodSource = "fallback";
    if (billing.currentPeriodEnd) {
        renewsAt = billing.currentPeriodEnd;
        periodSource = "stripe";
    }
    else {
        const d = new Date(renewsAt);
        d.setDate(d.getDate() + 30);
        renewsAt = d.toISOString();
    }
    return {
        ...base,
        available,
        monthlyQuota,
        used,
        renewsAt,
        planNormalized: (0, planNormalize_1.normalizePlan)(plan),
        periodSource,
    };
}
/**
 * Consome créditos efetivamente (com transação + log).
 */
async function consumeCredits(tenantId, amount, meta) {
    if (amount <= 0)
        return;
    const tenantRef = firebase_1.db.collection("tenants").doc(tenantId);
    await firebase_1.db.runTransaction(async (tx) => {
        const snap = await tx.get(tenantRef);
        const data = snap.data() || {};
        const credits = data.credits;
        if (meta?.usageLogId) {
            const logSnap = await tx.get(tenantRef.collection("usageLogs").doc(meta.usageLogId));
            if (logSnap.exists) {
                // Idempotency: Já consumiu
                return;
            }
        }
        const available = credits && typeof credits.available === "number"
            ? credits.available
            : 0;
        if (available < amount) {
            throw new errors_1.ApiError(402, "NO_CREDITS");
        }
        const newAvailable = available - amount;
        const now = nowISO();
        tx.set(tenantRef, {
            credits: {
                ...(credits || {}),
                available: newAvailable,
                updatedAt: now,
            },
        }, { merge: true });
        const usageRef = meta?.usageLogId
            ? tenantRef.collection("usageLogs").doc(meta.usageLogId)
            : tenantRef.collection("usageLogs").doc();
        tx.set(usageRef, {
            type: meta?.type ?? "generic",
            source: meta?.source ?? "api",
            creditsConsumed: amount,
            createdAt: now,
        });
    });
}
/**
 * Verifica se há créditos suficientes, e lança erro 402/NO_CREDITS se não houver.
 */
async function ensureCreditsOrThrow(tenantId, amount, type, plan) {
    // Garante reset se precisar
    await maybeResetMonthlyCredits(tenantId, plan);
    const ref = firebase_1.db.collection("tenants").doc(tenantId);
    const snap = await ref.get();
    const data = snap.data() || {};
    const credits = data.credits;
    const available = credits && typeof credits.available === "number"
        ? credits.available
        : 0;
    if (available < amount) {
        throw new errors_1.ApiError(402, "NO_CREDITS");
    }
}
