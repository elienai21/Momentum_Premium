"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantsRouter = void 0;
const firebase_1 = require("../services/firebase");
const express_1 = require("express");
// FIX: Add import for type augmentations
require("../types");
const zod_1 = require("zod");
const crypto_1 = require("crypto");
const tenants_1 = require("../core/tenants");
const features_1 = require("../config/features");
const logger_1 = require("../utils/logger");
const requireAuth_1 = require("../middleware/requireAuth");
const requireAdmin_1 = require("../middleware/requireAdmin");
const audit_1 = require("../core/audit");
exports.tenantsRouter = (0, express_1.Router)();
// Schema for creating a new tenant
const createTenantSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, "Name must be at least 2 characters long."),
    domain: zod_1.z.string().optional(),
    vertical: zod_1.z.enum(['finance', 'real_estate', 'condos']),
    planId: zod_1.z.string().min(1, "Plan ID is required."),
    theme: zod_1.z.string().min(1, "Theme is required."),
    ownerUid: zod_1.z.string().min(1, "Owner UID is required."),
    locale: zod_1.z.string().optional(),
    currency: zod_1.z.enum(['USD', 'BRL', 'EUR']).optional(),
});
// Unauthenticated endpoint for the frontend to resolve a domain to tenant branding info.
exports.tenantsRouter.get("/config-by-domain", async (req, res, next) => {
    try {
        const domain = req.query.domain;
        if (!domain) {
            return res.status(400).json({ status: "error", message: "Domain parameter is required." });
        }
        const tenantInfo = await (0, tenants_1.getTenantByDomain)(domain);
        if (!tenantInfo) {
            // It's not an error if a domain isn't found, the frontend will fallback.
            return res.status(404).json({ status: "not_found", message: "No tenant configured for this domain." });
        }
        // Load associated data for branding
        const flags = await (0, features_1.loadPlanFlags)(tenantInfo.planId);
        const brandingSnap = await firebase_1.db.collection('branding').doc(tenantInfo.theme).get();
        const branding = brandingSnap.exists ? brandingSnap.data() : {};
        const responsePayload = {
            id: tenantInfo.id,
            vertical: tenantInfo.vertical,
            theme: tenantInfo.theme,
            domain: tenantInfo.domain,
            flags,
            branding,
        };
        res.json({ status: "success", data: responsePayload });
    }
    catch (err) {
        logger_1.logger.error("Failed to get tenant config by domain", { error: err });
        next(err);
    }
});
// New endpoint to create a tenant, protected for admins only.
exports.tenantsRouter.post('/create', requireAuth_1.requireAuth, requireAdmin_1.requireAdmin, async (req, res, next) => {
    try {
        const tenantData = createTenantSchema.parse(req.body);
        // Generate a unique, URL-safe ID for the new tenant
        const tenantId = tenantData.name.toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '') + '-' + (0, crypto_1.randomUUID)().substring(0, 4);
        const newTenantObject = {
            ...tenantData,
            plan: tenantData.planId,
            billingStatus: 'trial', // New tenants start on a trial
            createdAt: new Date().toISOString(),
        };
        await firebase_1.db.collection('tenants').doc(tenantId).set(newTenantObject);
        await (0, audit_1.recordAudit)("createTenant", req.user.email, `New tenant '${tenantData.name}' created by admin.`, { tenantId, traceId: req.traceId });
        res.status(201).json({
            status: 'success',
            data: { id: tenantId, ...newTenantObject },
        });
    }
    catch (err) {
        logger_1.logger.error('Failed to create new tenant', { error: err, traceId: req.traceId }, req);
        next(err);
    }
});
