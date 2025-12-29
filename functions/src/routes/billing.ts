// functions/src/routes/billing.ts
import { Router } from "express";
import { ApiError } from "../utils/errors";
import { getCredits } from "../billing/creditsService";
import { PlanTier } from "../billing/creditsTypes";
import { z } from "zod";
import { reportUsageToStripe } from "src/utils/usageTracker";
import { db } from "src/services/firebase";

export const billingRouter = Router();

// POST /api/billing/report (Stripe usage)
const handleReportUsage = async (req: any, res: any, next: any) => {
  try {
    const schema = z.union([
      z.object({
        subscriptionItemId: z.string().min(1),
        amountCents: z.number().int().positive(),
      }),
      z.object({
        subscriptionItemId: z.string().min(1),
        tokens: z.number().int().nonnegative(),
      }),
    ]);

    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success) {
      return res
        .status(400)
        .json({ ok: false, error: parsed.error.toString(), code: "BAD_REQUEST" });
    }

    const subscriptionItemId = parsed.data.subscriptionItemId;
    const amountCents =
      "amountCents" in parsed.data ? parsed.data.amountCents : parsed.data.tokens;

    await reportUsageToStripe(subscriptionItemId, amountCents);
    return res.status(200).json({ status: "ok" });
  } catch (err) {
    next(err);
  }
};

// Aliases para compatibilidade
billingRouter.post("/report-usage", handleReportUsage);
billingRouter.post("/report", handleReportUsage);

// GET /api/billing/credits
billingRouter.get("/credits", async (req: any, res, next) => {
  try {
    if (!req.tenant) throw new ApiError(400, "Tenant context required");

    const tenantId = req.tenant.info.id;
    const planId = (req.tenant.info.plan || "starter") as PlanTier;

    const state = await getCredits(tenantId, planId);

    // Retorna objeto flat para compatibilidade com useCredits.ts
    res.json({
      available: state.available,
      monthlyQuota: state.monthlyQuota,
      used: state.used,
      renewsAt: state.renewsAt,
      lastResetAt: state.lastResetAt,
      planNormalized: state.planNormalized,
      periodSource: state.periodSource,
    });
  } catch (e: any) {
    next(
      new ApiError(
        500,
        e.message || "Erro ao carregar créditos de IA",
        req.traceId
      )
    );
  }
});

// GET /api/billing/usage-logs - Lista logs de uso para exibição no Settings
billingRouter.get("/usage-logs", async (req: any, res, next) => {
  try {
    if (!req.tenant) throw new ApiError(400, "Tenant context required");

    const tenantId = req.tenant.info.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const logsSnap = await db
      .collection("tenants")
      .doc(tenantId)
      .collection("usageLogs")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    const logs = logsSnap.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({ logs });
  } catch (e: any) {
    next(
      new ApiError(
        500,
        e.message || "Erro ao carregar logs de uso",
        req.traceId
      )
    );
  }
});
