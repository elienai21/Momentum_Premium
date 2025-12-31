// functions/src/routes/billing.ts
import { Router } from "express";
import { z } from "zod";
import { ApiError } from "../utils/errors";
import { getCredits } from "../billing/creditsService";
import { PlanTier } from "../billing/creditsTypes";
import { reportUsageToStripe } from "src/utils/usageTracker";
import { db } from "src/services/firebase";
import { getStripeClient } from "../billing/stripeBilling";
import { requireAuth } from "../middleware/requireAuth";
import { withTenant } from "../middleware/withTenant";
import { subscriptionItemBelongsToTenant } from "../utils/subscriptionItemGuard";

export const billingRouter = Router();

billingRouter.use(requireAuth, withTenant);

// GET /api/billing/portal - Redirect to Stripe Customer Portal
billingRouter.get("/portal", async (req: any, res, next) => {
  try {
    if (!req.tenant || !req.user) throw new ApiError(400, "Tenant context required");

    const tenantId = req.tenant.info.id;
    const tenantDoc = await db.collection("tenants").doc(tenantId).get();
    const billing = tenantDoc.data()?.billing || {};

    if (!billing.stripeCustomerId) {
      // Return a friendly response instead of error for frontend to handle
      return res.json({
        url: null,
        error: "Conta de faturamento ainda não configurada.",
        code: "requires_setup",
        action: "setup_billing",
      });
    }

    const stripe = getStripeClient();
    const returnUrl = (req.headers.origin || "http://localhost:3000") + "/settings?tab=billing";

    const session = await stripe.billingPortal.sessions.create({
      customer: billing.stripeCustomerId,
      return_url: returnUrl,
    });

    res.json({
      url: session.url,
    });
  } catch (e: any) {
    next(
      new ApiError(500, e.message || "Erro ao gerar portal de faturamento", req.traceId)
    );
  }
});

// POST /api/billing/report (Stripe usage)
const handleReportUsage = async (req: any, res: any, next: any) => {
  try {
    if (!req.tenant || !req.user) throw new ApiError(400, "Tenant context required");
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

    const tenantId = req.tenant.info.id as string;
    const belongsToTenant = await subscriptionItemBelongsToTenant(tenantId, subscriptionItemId);
    if (!belongsToTenant) {
      return res.status(403).json({
        ok: false,
        error: "Subscription item does not belong to tenant",
        code: "INVALID_SUBSCRIPTION_ITEM",
      });
    }

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
    if (!req.tenant || !req.user) throw new ApiError(400, "Tenant context required");

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
    if (!req.tenant || !req.user) throw new ApiError(400, "Tenant context required");

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

