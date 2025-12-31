"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRouter = void 0;
const firebase_1 = require("../services/firebase");
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
// GET /api/admin/economics - Detailed Unit Economics
exports.adminRouter.get("/economics", async (req, res, next) => {
    try {
        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);
        // Using FirestoreAdapter or direct DB access? Usage logs are root collection.
        // Let's use direct DB for aggregation scripts usually.
        // Querying all logs for 30 days might be heavy if massive scale, but for "Premium" MVP it fits.
        // Optimally we would use an aggregation query, but let's fetch for flexibility in "kind" grouping.
        // Note: In production with millions of logs, this needs BigQuery or specialized counter docs.
        const logsSnap = await firebase_1.db.collection("usage_logs")
            .where("timestamp", ">=", thirtyDaysAgo.toISOString())
            .get();
        let totalTokens = 0;
        const tenantUsage = {};
        const dailyCost = {}; // YYYY-MM-DD -> cost
        logsSnap.docs.forEach((doc) => {
            const data = doc.data();
            const tokens = data.tokens || 0;
            const tId = data.tenantId || "unknown";
            const date = (data.timestamp || "").split("T")[0]; // primitive day grouping
            totalTokens += tokens;
            tenantUsage[tId] = (tenantUsage[tId] || 0) + tokens;
            const cost = tokens * 0.000005; // $5 per 1M tokens approx mixed blend
            dailyCost[date] = (dailyCost[date] || 0) + cost;
        });
        const totalEstimatedCost = totalTokens * 0.000005;
        // Sort top spenders
        const topSpenders = Object.entries(tenantUsage)
            .map(([tenantId, tokens]) => ({
            tenantId,
            tokens,
            cost: tokens * 0.000005
        }))
            .sort((a, b) => b.tokens - a.tokens)
            .slice(0, 5);
        // Enriched tenant info could be fetched here, but we'll return IDs and let frontend or separate call handle names if needed.
        // Actually, let's fetch names for the table.
        // We already have "getAllTenants" logic available via adapter or raw query.
        // To keep it fast, we only fetch the top 5 tenants docs.
        const enrichedSpenders = await Promise.all(topSpenders.map(async (s) => {
            if (s.tenantId === "unknown")
                return { ...s, name: "Unknown", plan: "N/A" };
            const tDoc = await firebase_1.db.collection("tenants").doc(s.tenantId).get();
            const tData = tDoc.data();
            return {
                ...s,
                name: tData?.name || "Unknown Tenant",
                plan: tData?.plan || "unknown"
            };
        }));
        // Active Tenants (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);
        const activeTenantsSet = new Set();
        // Re-iterate logs? No, we have them in memory.
        logsSnap.docs.forEach((doc) => {
            const d = doc.data();
            if (d.timestamp >= sevenDaysAgo.toISOString()) {
                activeTenantsSet.add(d.tenantId);
            }
        });
        res.json({
            status: "success",
            data: {
                totalTokens,
                totalEstimatedCost,
                activeTenantsCount: activeTenantsSet.size,
                dailyCost, // For Chart
                topSpenders: enrichedSpenders
            }
        });
    }
    catch (err) {
        next(err);
    }
});
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
