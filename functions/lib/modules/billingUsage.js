"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.billingRouter = void 0;
const firebase_1 = require("../services/firebase");
// functions/src/modules/billingUsage.ts
const express_1 = require("express");
const zod_1 = require("zod");
const requireAuth_1 = require("../middleware/requireAuth");
const withTenant_1 = require("../middleware/withTenant");
const usageTracker_1 = require("../utils/usageTracker");
const subscriptionItemGuard_1 = require("../utils/subscriptionItemGuard");
exports.billingRouter = (0, express_1.Router)();
exports.billingRouter.use(requireAuth_1.requireAuth, withTenant_1.withTenant);
exports.billingRouter.get("/api/billing/usage", async (req, res) => {
    const tenantId = req.tenant?.info?.id || req.user?.tenantId;
    if (!tenantId) {
        return res.status(400).json({ error: "Tenant context required" });
    }
    const logs = await firebase_1.db
        .collection("usage_logs")
        .where("tenantId", "==", tenantId)
        .orderBy("createdAt", "desc")
        .limit(50)
        .get();
    res.json(logs.docs.map((d) => d.data()));
});
exports.billingRouter.post("/api/billing/report", async (req, res) => {
    const body = req.body || {};
    const schema = zod_1.z.union([
        zod_1.z.object({
            subscriptionItemId: zod_1.z.string().min(1),
            amountCents: zod_1.z.number().int().nonnegative(),
        }),
        zod_1.z.object({
            subscriptionItemId: zod_1.z.string().min(1),
            tokens: zod_1.z.number().int().nonnegative(),
        }),
    ]);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.toString() });
    }
    const subscriptionItemId = parsed.data.subscriptionItemId;
    const amountCents = "amountCents" in parsed.data ? parsed.data.amountCents : parsed.data.tokens;
    const tenantId = req.tenant?.info?.id || req.user?.tenantId;
    if (!tenantId) {
        return res.status(400).json({ error: "Tenant context required" });
    }
    const belongsToTenant = await (0, subscriptionItemGuard_1.subscriptionItemBelongsToTenant)(tenantId, subscriptionItemId);
    if (!belongsToTenant) {
        return res.status(403).json({ error: "Subscription item does not belong to tenant" });
    }
    await (0, usageTracker_1.reportUsageToStripe)(subscriptionItemId, amountCents);
    res.json({ status: "ok" });
});
