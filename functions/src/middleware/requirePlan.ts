import { db } from "src/services/firebase";
import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/errors";
import { logger } from "../utils/logger";

const PLAN_PRIORITY = { free: 1, pro: 2, enterprise: 3 };

/**
 * Middleware de restrição mínima por plano
 * Exemplo: router.use("/ai", requirePlan("pro"), aiRouter)
 */
export function requirePlan(minPlan: keyof typeof PLAN_PRIORITY) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.tenant) throw new ApiError(401, "Tenant context required.");

      const plan = (req.tenant.info?.plan || "free").toLowerCase() as keyof typeof PLAN_PRIORITY;
      const tenantId = req.tenant.info?.id || "unknown";

      logger.info("Checking plan access", { tenantId, plan, required: minPlan, traceId: req.traceId });

      if (PLAN_PRIORITY[plan] < PLAN_PRIORITY[minPlan]) {
        logger.warn("Plan restriction denied", { tenantId, plan, required: minPlan, traceId: req.traceId });
        return res.status(403).json({
          ok: false,
          error: `This resource requires at least the ${minPlan.toUpperCase()} plan.`,
          currentPlan: plan,
        });
      }

      next();
    } catch (error) {
      logger.error("requirePlan middleware failed", { error, traceId: req.traceId });
      next(error);
    }
  };
}



