"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.billingRouter = exports.router = void 0;
const express_1 = require("express");
const errors_1 = require("../middleware/errors");
const billing_1 = require("../contracts/billing");
const billingService_1 = require("../services/billingService");
const creditsService_1 = require("../billing/creditsService");
const requireAuth_1 = require("../middleware/requireAuth");
const withTenant_1 = require("../middleware/withTenant");
const subscriptionItemGuard_1 = require("../utils/subscriptionItemGuard");
exports.router = (0, express_1.Router)();
exports.billingRouter = exports.router;
exports.router.use(requireAuth_1.requireAuth, withTenant_1.withTenant);
// POST /api/billing/report-usage
exports.router.post("/report-usage", async (req, res, next) => {
    try {
        if (!req.tenant || !req.user)
            throw new errors_1.ApiError(400, "Tenant context required");
        const dto = billing_1.BillingUsageSchema.parse(req.body);
        const tenantId = req.tenant.info.id;
        const belongsToTenant = await (0, subscriptionItemGuard_1.subscriptionItemBelongsToTenant)(tenantId, dto.subscriptionItemId);
        if (!belongsToTenant) {
            throw new errors_1.ApiError(403, "Subscription item does not belong to tenant");
        }
        const out = await (0, billingService_1.reportUsage)(tenantId, dto);
        const safe = billing_1.BillingResponseSchema.safeParse(out);
        if (!safe.success)
            throw new errors_1.ApiError(500, "Invalid billing response format");
        res.status(out.ok ? 200 : 500).json(safe.data);
    }
    catch (err) {
        next(err);
    }
});
// GET /api/billing/credits
exports.router.get("/credits", async (req, res, next) => {
    try {
        if (!req.tenant || !req.user) {
            throw new errors_1.ApiError(400, "Tenant context required", req.traceId);
        }
        const tenantId = req.tenant.info.id;
        const planId = (req.tenant.info.plan || "starter");
        // getCredits(tenantId, plan) → CreditsState (sem campo plan)
        const state = await (0, creditsService_1.getCredits)(tenantId, planId);
        const dto = {
            plan: planId,
            available: state.available,
            monthlyQuota: state.monthlyQuota,
            used: state.used,
            renewsAt: state.renewsAt,
        };
        const response = {
            ok: true,
            data: dto,
            traceId: req.traceId,
        };
        res.status(200).json(response);
    }
    catch (err) {
        next(new errors_1.ApiError(500, err?.message || "Erro ao carregar créditos de IA", req.traceId));
    }
});
