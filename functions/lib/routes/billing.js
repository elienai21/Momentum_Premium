"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.billingRouter = void 0;
// functions/src/routes/billing.ts
const express_1 = require("express");
const errors_1 = require("../utils/errors");
const creditsService_1 = require("../billing/creditsService");
const zod_1 = require("zod");
const usageTracker_1 = require("../utils/usageTracker");
exports.billingRouter = (0, express_1.Router)();
// POST /api/billing/report (Stripe usage)
const handleReportUsage = async (req, res, next) => {
    try {
        const schema = zod_1.z.union([
            zod_1.z.object({
                subscriptionItemId: zod_1.z.string().min(1),
                amountCents: zod_1.z.number().int().positive(),
            }),
            zod_1.z.object({
                subscriptionItemId: zod_1.z.string().min(1),
                tokens: zod_1.z.number().int().nonnegative(),
            }),
        ]);
        const parsed = schema.safeParse(req.body || {});
        if (!parsed.success) {
            return res
                .status(400)
                .json({ ok: false, error: parsed.error.toString(), code: "BAD_REQUEST" });
        }
        const subscriptionItemId = parsed.data.subscriptionItemId;
        const amountCents = "amountCents" in parsed.data ? parsed.data.amountCents : parsed.data.tokens;
        await (0, usageTracker_1.reportUsageToStripe)(subscriptionItemId, amountCents);
        return res.status(200).json({ status: "ok" });
    }
    catch (err) {
        next(err);
    }
};
// Aliases para compatibilidade
exports.billingRouter.post("/report-usage", handleReportUsage);
exports.billingRouter.post("/report", handleReportUsage);
// GET /api/billing/credits
exports.billingRouter.get("/credits", async (req, res, next) => {
    try {
        if (!req.tenant)
            throw new errors_1.ApiError(400, "Tenant context required");
        const tenantId = req.tenant.info.id;
        const planId = (req.tenant.info.plan || "starter");
        const state = await (0, creditsService_1.getCredits)(tenantId, planId);
        res.json({
            status: "ok",
            credits: {
                available: state.available,
                monthlyQuota: state.monthlyQuota,
                used: state.used,
                renewsAt: state.renewsAt,
            },
        });
    }
    catch (e) {
        next(new errors_1.ApiError(500, e.message || "Erro ao carregar créditos de IA", req.traceId));
    }
});
