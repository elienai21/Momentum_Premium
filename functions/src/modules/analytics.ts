import { db } from "src/services/firebase";
// src/modules/analytics.ts
import { Router } from "express";
import { ApiError } from "../middleware/errors";
import { FilterSchema, ForecastResponseSchema } from "../contracts/analytics";
import { logger } from "../utils/logger";
import { getForecastForTenant, filterTransactions } from "../services/analyticsService";

export const router = Router();

// GET /api/v1/analytics/forecast
router.get("/forecast", async (req, res, next) => {
  try {
    if (!req.tenant) throw new ApiError(400, "Tenant context required");
    const { from, to } = FilterSchema.pick({ from: true, to: true }).parse(req.query);

    const out = await getForecastForTenant({
      tenantId: req.tenant.info.id,
      from: from ?? undefined,
      to: to ?? undefined,
      locale: req.tenant.info.locale ?? "pt-BR",
      traceId: req.traceId
    });

    // garante shape de resposta
    const safe = ForecastResponseSchema.safeParse(out);
    if (!safe.success) {
      logger.error("Invalid forecast response shape", { issues: safe.error.issues }, req);
      throw new ApiError(500, "Invalid forecast response");
    }

    res.json(safe.data);
  } catch (err) { next(err); }
});

// POST /api/v1/analytics/transactions/filter
router.post("/transactions/filter", async (req, res, next) => {
  try {
    if (!req.tenant) throw new ApiError(400, "Tenant context required");
    const dto = FilterSchema.parse(req.body);

    const out = await filterTransactions({
      tenantId: req.tenant.info.id,
      filter: dto,
      traceId: req.traceId
    });

    res.json({ transactions: out });
  } catch (err) { next(err); }
});



