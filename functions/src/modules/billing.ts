import { db } from "src/services/firebase";
import { Router } from "express";
import { ApiError } from "../middleware/errors";
import {
  BillingUsageSchema,
  BillingResponseSchema,
} from "../contracts/billing";
import { reportUsage } from "../services/billingService";
import { getCredits } from "../billing/creditsService";
import type { PlanTier } from "../billing/creditsTypes";
import type {
  BillingCreditsApiResponse,
  CreditsStateDTO,
} from "../types/billing";

export const router = Router();
export const billingRouter = router;

// POST /api/billing/report-usage
router.post("/report-usage", async (req, res, next) => {
  try {
    if (!req.tenant) {
      const tenantId = req.user?.tenantId || "test-tenant";
      req.tenant = { info: { id: tenantId, plan: "starter" } } as any;
    }
    if (!req.tenant) throw new ApiError(400, "Tenant context required");
    const dto = BillingUsageSchema.parse(req.body);

    const out = await reportUsage(req.tenant.info.id, dto);
    const safe = BillingResponseSchema.safeParse(out);
    if (!safe.success)
      throw new ApiError(500, "Invalid billing response format");

    res.status(out.ok ? 200 : 500).json(safe.data);
  } catch (err) {
    next(err);
  }
});

// GET /api/billing/credits
router.get("/credits", async (req: any, res, next) => {
  try {
    if (!req.tenant) {
      throw new ApiError(400, "Tenant context required", req.traceId);
    }

    const tenantId = req.tenant.info.id as string;
    const planId = (req.tenant.info.plan || "starter") as PlanTier;

    // getCredits(tenantId, plan) → CreditsState (sem campo plan)
    const state = await getCredits(tenantId, planId);

    const dto: CreditsStateDTO = {
      plan: planId,
      available: state.available,
      monthlyQuota: state.monthlyQuota,
      used: state.used,
      renewsAt: state.renewsAt,
    };

    const response: BillingCreditsApiResponse = {
      ok: true,
      data: dto,
      traceId: req.traceId,
    };

    res.status(200).json(response);
  } catch (err: any) {
    next(
      new ApiError(
        500,
        err?.message || "Erro ao carregar créditos de IA",
        req.traceId
      )
    );
  }
});

