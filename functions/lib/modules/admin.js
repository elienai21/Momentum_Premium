"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRouter = void 0;
const firebase_1 = require("src/services/firebase");
const express_1 = require("express");
// FIX: Add import for type augmentations
require("../types");
const requireAuth_1 = require("../middleware/requireAuth");
const requireAdmin_1 = require("../middleware/requireAdmin");
const errors_1 = require("../utils/errors");
const withTenant_1 = require("../middleware/withTenant");
const firestore_1 = require("../core/adapters/firestore");
exports.adminRouter = (0, express_1.Router)();
// All admin routes require authentication and admin privileges
exports.adminRouter.use(requireAuth_1.requireAuth, requireAdmin_1.requireAdmin);
exports.adminRouter.get("/analytics", async (req, res, next) => {
    try {
        const db = new firestore_1.FirestoreAdapter();
        const tenants = await db.getAllTenants();
        const usageData = await Promise.all(tenants.map(t => db.getTenantUsageAnalytics(t.id)));
        const totalTransactions = usageData.reduce((sum, current) => sum + current.transactionCount, 0);
        res.json({
            status: "success",
            data: {
                tenantCount: tenants.length,
                totalTransactions,
            },
        });
    }
    catch (err) {
        next(err);
    }
});
exports.adminRouter.get("/clients", async (req, res, next) => {
    try {
        const db = new firestore_1.FirestoreAdapter();
        const tenants = await db.getAllTenants();
        const clientData = tenants.map(t => ({
            id: t.id,
            name: t.name,
            email: t.ownerEmail,
            plan: t.planId,
            status: t.billingStatus,
            createdAt: t.createdAt,
        }));
        res.json({ status: "success", data: clientData });
    }
    catch (err) {
        next(err);
    }
});
exports.adminRouter.get("/check-setup", withTenant_1.withTenant, async (req, res, next) => {
    try {
        if (!req.tenant)
            throw new errors_1.ApiError(400, "Tenant context is required for setup check.");
        const db = new firestore_1.FirestoreAdapter();
        const result = await db.checkTenantSetup(req.tenant.info.id);
        res.json({ status: "success", data: result });
    }
    catch (err) {
        next(err);
    }
});
exports.adminRouter.get("/usage-report/:tenantId", async (req, res, next) => {
    try {
        const { tenantId } = req.params;
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const snap = await firebase_1.db.collection('usage_logs')
            .where('tenantId', '==', tenantId)
            .where('createdAt', '>=', startOfMonth)
            .get();
        let totalTokens = 0;
        const usageByKind = {};
        snap.docs.forEach((doc) => {
            const data = doc.data();
            totalTokens += data.tokens || 0;
            if (data.kind) {
                usageByKind[data.kind] = (usageByKind[data.kind] || 0) + (data.tokens || 0);
            }
        });
        res.json({
            status: 'success',
            data: {
                tenantId,
                periodStart: startOfMonth,
                totalTokens,
                usageByKind,
            },
        });
    }
    catch (err) {
        next(err);
    }
});
