// functions/src/billing/creditsService.ts
import { db } from "src/services/firebase";
import { ApiError } from "../utils/errors";
import { CreditsState, TenantCredits, PlanTier } from "./creditsTypes";
import { CREDIT_COSTS, CreditFeatureKey } from "../config/credits";
import { normalizePlan } from "./planNormalize";

function resolveMonthlyCreditsForPlan(plan: PlanTier): number {
  const normalized = normalizePlan(plan);
  if (normalized === "pro") return 2000;
  if (normalized === "premium_lite") return 1000;
  if (normalized === "business") return 5000;
  return 300; // starter/default
}

function nowISO() {
  return new Date().toISOString();
}

/**
 * Inicializa ou normaliza o bloco de créditos de um tenant.
 */
async function initCreditsIfNeeded(
  tenantId: string,
  plan: PlanTier
): Promise<TenantCredits> {
  const ref = db.collection("tenants").doc(tenantId);

  let result: TenantCredits | null = null;

  await db.runTransaction(async (tx: any) => {
    const snap = await tx.get(ref);
    const data = (snap.data() as any) || {};
    const existing: TenantCredits | undefined = data.credits;

    const monthlyQuota = resolveMonthlyCreditsForPlan(plan);

    if (!existing) {
      const created: TenantCredits = {
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
    const normalized: TenantCredits = {
      available:
        typeof existing.available === "number" ? existing.available : monthlyQuota,
      monthlyQuota:
        typeof existing.monthlyQuota === "number"
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

  return result!;
}

/**
 * Verifica se é hora de resetar créditos mensais.
 * Prioriza o ciclo do Stripe (tenant.billing.currentPeriodEnd).
 * Fallback: 30 dias desde lastResetAt.
 */
export async function maybeResetMonthlyCredits(
  tenantId: string,
  plan: PlanTier
): Promise<TenantCredits> {
  const ref = db.collection("tenants").doc(tenantId);
  const now = nowISO();
  const monthlyQuota = resolveMonthlyCreditsForPlan(plan);

  let out: TenantCredits | null = null;

  await db.runTransaction(async (tx: any) => {
    const snap = await tx.get(ref);
    const data = (snap.data() as any) || {};
    const existing: TenantCredits | undefined = data.credits;
    const billing = data.billing || {};

    // 1. Determina a data de renovação (renewsAt)
    const stripeEnd = billing.currentPeriodEnd;
    let renewsAt: string;

    if (stripeEnd) {
      renewsAt = stripeEnd;
    } else {
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

      const reset: TenantCredits = {
        available: monthlyQuota,
        monthlyQuota,
        lastResetAt: newLastReset,
        updatedAt: now,
      };

      tx.set(ref, { credits: reset }, { merge: true });
      out = reset;
    } else {
      out = {
        available: typeof existing.available === "number" ? existing.available : 0,
        monthlyQuota: existing?.monthlyQuota ?? monthlyQuota,
        lastResetAt: existing?.lastResetAt ?? now,
        updatedAt: existing?.updatedAt,
      };
    }
  });

  return out!;
}

/**
 * Retorna o estado de créditos para exibição no front.
 */
export async function getCredits(
  tenantId: string,
  plan: PlanTier
): Promise<CreditsState> {
  const ref = db.collection("tenants").doc(tenantId);
  const now = nowISO();
  const monthlyQuota = resolveMonthlyCreditsForPlan(plan);

  const snap = await ref.get();
  const data = (snap.data() as any) || {};
  const existing: TenantCredits | undefined = data.credits;
  const billing = data.billing || {};

  const base: TenantCredits = existing ?? {
    available: monthlyQuota,
    monthlyQuota,
    lastResetAt: now,
    updatedAt: now,
  };

  const available =
    typeof base.available === "number" ? base.available : monthlyQuota;

  const used = Math.max(0, monthlyQuota - available);

  let renewsAt = base.lastResetAt ?? now;
  let periodSource: "stripe" | "fallback" = "fallback";

  if (billing.currentPeriodEnd) {
    renewsAt = billing.currentPeriodEnd;
    periodSource = "stripe";
  } else {
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
    planNormalized: normalizePlan(plan),
    periodSource,
  };
}

/**
 * Consome créditos efetivamente (com transação + log).
 */
export async function consumeCredits(
  tenantId: string,
  amount: number,
  meta?: { type: string; source?: string; usageLogId?: string }
): Promise<void> {
  if (amount <= 0) return;

  const tenantRef = db.collection("tenants").doc(tenantId);

  await db.runTransaction(async (tx: any) => {
    const snap = await tx.get(tenantRef);
    const data = (snap.data() as any) || {};
    const credits: TenantCredits | undefined = data.credits;

    if (meta?.usageLogId) {
      const logSnap = await tx.get(tenantRef.collection("usageLogs").doc(meta.usageLogId));
      if (logSnap.exists) {
        // Idempotency: Já consumiu
        return;
      }
    }

    const available =
      credits && typeof credits.available === "number"
        ? credits.available
        : 0;

    if (available < amount) {
      throw new ApiError(402, "NO_CREDITS");
    }

    const newAvailable = available - amount;
    const now = nowISO();

    tx.set(
      tenantRef,
      {
        credits: {
          ...(credits || {}),
          available: newAvailable,
          updatedAt: now,
        },
      },
      { merge: true }
    );

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
export async function ensureCreditsOrThrow(
  tenantId: string,
  amount: number,
  type: CreditFeatureKey,
  plan: PlanTier
): Promise<void> {
  // Garante reset se precisar
  await maybeResetMonthlyCredits(tenantId, plan);

  const ref = db.collection("tenants").doc(tenantId);
  const snap = await ref.get();
  const data = (snap.data() as any) || {};
  const credits: TenantCredits | undefined = data.credits;

  const available =
    credits && typeof credits.available === "number"
      ? credits.available
      : 0;

  if (available < amount) {
    throw new ApiError(402, "NO_CREDITS");
  }
}
