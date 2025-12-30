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
const withTenant_1 = require("../middleware/withTenant");
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
// =============================================================================
// TEAM MANAGEMENT
// =============================================================================
// Schema for inviting a member
const inviteMemberSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    role: zod_1.z.enum(['admin', 'member', 'viewer']),
});
// POST /tenants/invite - Invite a user to the tenant
exports.tenantsRouter.post('/invite', requireAuth_1.requireAuth, withTenant_1.withTenant, requireAdmin_1.requireAdmin, async (req, res, next) => {
    try {
        const { email, role } = inviteMemberSchema.parse(req.body);
        const tenantId = req.tenant.info.id;
        // TODO: limitation check (max users per plan) could go here
        const inviteData = {
            email,
            role,
            invitedBy: req.user.uid,
            invitedByEmail: req.user.email,
            status: 'pending',
            createdAt: new Date().toISOString(),
            tenantId,
            tenantName: req.tenant.info.name
        };
        // Create invite document
        const inviteRef = await firebase_1.db.collection('tenants').doc(tenantId).collection('invites').add(inviteData);
        await (0, audit_1.recordAudit)("inviteMember", req.user.email, `Invited ${email} as ${role}`, { tenantId, inviteId: inviteRef.id, traceId: req.traceId });
        res.status(201).json({ status: 'success', id: inviteRef.id });
    }
    catch (err) {
        logger_1.logger.error('Failed to invite member', { error: err }, req);
        next(err);
    }
});
// GET /tenants/members - List members and invites
exports.tenantsRouter.get('/members', requireAuth_1.requireAuth, withTenant_1.withTenant, async (req, res, next) => {
    try {
        const tenantId = req.tenant.info.id;
        const [membersSnap, invitesSnap] = await Promise.all([
            firebase_1.db.collection('tenants').doc(tenantId).collection('members').get(),
            firebase_1.db.collection('tenants').doc(tenantId).collection('invites').get()
        ]);
        const members = membersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        const invites = invitesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        res.json({ status: 'success', data: { members, invites } });
    }
    catch (err) {
        next(err);
    }
});
// DELETE /tenants/members/:uid - Remove a member
exports.tenantsRouter.delete('/members/:uid', requireAuth_1.requireAuth, withTenant_1.withTenant, requireAdmin_1.requireAdmin, async (req, res, next) => {
    try {
        const { uid } = req.params;
        const tenantId = req.tenant.info.id;
        if (uid === req.user.uid) {
            return res.status(400).json({ status: 'error', message: 'Calculated safety: Cannot remove yourself.' });
        }
        // Remove from members subcollection
        await firebase_1.db.collection('tenants').doc(tenantId).collection('members').doc(uid).delete();
        await (0, audit_1.recordAudit)("removeMember", req.user.email, `Removed member ${uid}`, { tenantId, targetUid: uid, traceId: req.traceId });
        res.json({ status: 'success' });
    }
    catch (err) {
        next(err);
    }
});
// DELETE /tenants/invites/:inviteId - Cancel invite
exports.tenantsRouter.delete('/invites/:inviteId', requireAuth_1.requireAuth, withTenant_1.withTenant, requireAdmin_1.requireAdmin, async (req, res, next) => {
    try {
        const { inviteId } = req.params;
        const tenantId = req.tenant.info.id;
        await firebase_1.db.collection('tenants').doc(tenantId).collection('invites').doc(inviteId).delete();
        res.json({ status: 'success' });
    }
    catch (err) {
        next(err);
    }
});
