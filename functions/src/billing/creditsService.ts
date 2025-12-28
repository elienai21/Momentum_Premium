// functions/src/billing/creditsService.ts
import { db } from "src/services/firebase";
import { ApiError } from "../utils/errors";
import { CreditsState, TenantCredits, PlanTier } from "./creditsTypes";
import { CREDIT_COSTS, CreditFeatureKey } from "../config/credits";

// Se você já tiver um helper de planos, pode usar.
// Aqui vou assumir que o plano e quota vêm do próprio tenant.
function resolveMonthlyCreditsForPlan(plan: PlanTier): number {
  const p = (plan || "").toString().toLowerCase();
  if (p === "pro") return 2000;
  if (p === "cfo" || p === "business") return 5000;
  return 300; // starter/default
}

function nowISO() {
  return new Date().toISOString();
}

function diffInDays(aISO: string | null, bISO: string): number {
  if (!aISO) return Number.POSITIVE_INFINITY;
  const a = new Date(aISO).getTime();
  const b = new Date(bISO).getTime();
  return (b - a) / (1000 * 60 * 60 * 24);
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
 * Critério simples: se passaram ≥ 30 dias desde lastResetAt.
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

    // Se nunca teve créditos, inicializa
    if (!existing) {
      const created: TenantCredits = {
        available: monthlyQuota,
        monthlyQuota,
        lastResetAt: now,
      };
      tx.set(ref, { credits: created }, { merge: true });
      out = created;
      return;
    }

    const lastResetAt = existing.lastResetAt ?? now;
    const daysDiff = diffInDays(lastResetAt, now);

    if (daysDiff >= 30 || existing.monthlyQuota !== monthlyQuota) {
      const reset: TenantCredits = {
        available: monthlyQuota,
        monthlyQuota,
        lastResetAt: now,
      };
      tx.set(ref, { credits: reset }, { merge: true });
      out = reset;
    } else {
      out = {
        available: typeof existing.available === "number" ? existing.available : 0,
        monthlyQuota:
          typeof existing.monthlyQuota === "number"
            ? existing.monthlyQuota
            : monthlyQuota,
        lastResetAt,
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

  const base: TenantCredits = existing ?? {
    available: monthlyQuota,
    monthlyQuota,
    lastResetAt: now,
  };

  const available =
    typeof base.available === "number" ? base.available : monthlyQuota;

  const used = Math.max(0, monthlyQuota - available);
  const renewsAt = base.lastResetAt ?? now;

  return {
    available,
    monthlyQuota,
    lastResetAt: base.lastResetAt,
    used,
    renewsAt,
  };
}

/**
 * Consome créditos efetivamente (com transação + log).
 */
export async function consumeCredits(
  tenantId: string,
  amount: number,
  meta?: { type: string; source?: string }
): Promise<void> {
  if (amount <= 0) return;

  const tenantRef = db.collection("tenants").doc(tenantId);
  const usageRef = tenantRef.collection("usageLogs").doc();

  await db.runTransaction(async (tx: any) => {
    const snap = await tx.get(tenantRef);
    const data = (snap.data() as any) || {};
    const credits: TenantCredits | undefined = data.credits;

    const available =
      credits && typeof credits.available === "number"
        ? credits.available
        : 0;

    if (available < amount) {
      throw new ApiError(
        402,
        "NO_CREDITS" // código interno, handler pode mapear mensagem amigável
      );
    }

    const newAvailable = available - amount;

    tx.set(
      tenantRef,
      {
        credits: {
          ...(credits || {}),
          available: newAvailable,
        },
      },
      { merge: true }
    );

    tx.set(usageRef, {
      type: meta?.type ?? "generic",
      source: meta?.source ?? "api",
      creditsConsumed: amount,
      createdAt: nowISO(),
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
    throw new ApiError(
      402,
      "NO_CREDITS" // o handler HTTP transforma em { code, message }
    );
  }
}

