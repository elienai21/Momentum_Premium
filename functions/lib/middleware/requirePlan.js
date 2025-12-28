"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirePlan = requirePlan;
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
const PLAN_PRIORITY = { free: 1, pro: 2, enterprise: 3 };
/**
 * Middleware de restrição mínima por plano
 * Exemplo: router.use("/ai", requirePlan("pro"), aiRouter)
 */
function requirePlan(minPlan) {
    return (req, res, next) => {
        try {
            if (!req.tenant)
                throw new errors_1.ApiError(401, "Tenant context required.");
            const plan = (req.tenant.info?.plan || "free").toLowerCase();
            const tenantId = req.tenant.info?.id || "unknown";
            logger_1.logger.info("Checking plan access", { tenantId, plan, required: minPlan, traceId: req.traceId });
            if (PLAN_PRIORITY[plan] < PLAN_PRIORITY[minPlan]) {
                logger_1.logger.warn("Plan restriction denied", { tenantId, plan, required: minPlan, traceId: req.traceId });
                return res.status(403).json({
                    ok: false,
                    error: `This resource requires at least the ${minPlan.toUpperCase()} plan.`,
                    currentPlan: plan,
                });
            }
            next();
        }
        catch (error) {
            logger_1.logger.error("requirePlan middleware failed", { error, traceId: req.traceId });
            next(error);
        }
    };
}
