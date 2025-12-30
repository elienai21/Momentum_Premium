"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.billingRouter = void 0;
// functions/src/routes/billing.ts
const express_1 = require("express");
const errors_1 = require("../utils/errors");
const creditsService_1 = require("../billing/creditsService");
const zod_1 = require("zod");
const usageTracker_1 = require("src/utils/usageTracker");
const firebase_1 = require("src/services/firebase");
const stripeBilling_1 = require("../billing/stripeBilling");
exports.billingRouter = (0, express_1.Router)();
// ... existing code ...
// GET /api/billing/portal - Redirect to Stripe Customer Portal
exports.billingRouter.get("/portal", async (req, res, next) => {
    try {
        if (!req.tenant)
            throw new errors_1.ApiError(400, "Tenant context required");
        const tenantId = req.tenant.info.id;
        const tenantDoc = await firebase_1.db.collection("tenants").doc(tenantId).get();
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
        const stripe = (0, stripeBilling_1.getStripeClient)();
        const returnUrl = (req.headers.origin || "http://localhost:3000") + "/settings?tab=billing";
        const session = await stripe.billingPortal.sessions.create({
            customer: billing.stripeCustomerId,
            return_url: returnUrl,
        });
        res.json({
            url: session.url,
        });
    }
    catch (e) {
        next(new errors_1.ApiError(500, e.message || "Erro ao gerar portal de faturamento", req.traceId));
    }
});
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
    }
    catch (e) {
        next(new errors_1.ApiError(500, e.message || "Erro ao carregar créditos de IA", req.traceId));
    }
});
// GET /api/billing/usage-logs - Lista logs de uso para exibição no Settings
exports.billingRouter.get("/usage-logs", async (req, res, next) => {
    try {
        if (!req.tenant)
            throw new errors_1.ApiError(400, "Tenant context required");
        const tenantId = req.tenant.info.id;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const logsSnap = await firebase_1.db
            .collection("tenants")
            .doc(tenantId)
            .collection("usageLogs")
            .orderBy("createdAt", "desc")
            .limit(limit)
            .get();
        const logs = logsSnap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
        res.json({ logs });
    }
    catch (e) {
        next(new errors_1.ApiError(500, e.message || "Erro ao carregar logs de uso", req.traceId));
    }
});
