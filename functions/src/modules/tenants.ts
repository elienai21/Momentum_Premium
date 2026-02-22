import { db } from "src/services/firebase";

import { Request, Response, NextFunction, Router } from "express";
// FIX: Add import for type augmentations
import "../types";

import { z } from "zod";
import { randomUUID } from "crypto";
import { getTenantByDomain } from "../core/tenants";
import { loadPlanFlags, loadPlan } from "../config/features";
import { logger } from "../utils/logger";
import { requireAuth } from "../middleware/requireAuth";
import { requireAdmin } from "../middleware/requireAdmin";
import { recordAudit } from "../core/audit";
import { withTenant, invalidateTenantCache } from "../middleware/withTenant";

export const tenantsRouter = Router();

// Schema for creating a new tenant
const createTenantSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long."),
  domain: z.string().optional(),
  vertical: z.enum(['finance', 'real_estate', 'condos']),
  planId: z.string().min(1, "Plan ID is required."),
  theme: z.string().min(1, "Theme is required."),
  ownerUid: z.string().min(1, "Owner UID is required."),
  locale: z.string().optional(),
  currency: z.enum(['USD', 'BRL', 'EUR']).optional(),
});


// Unauthenticated endpoint for the frontend to resolve a domain to tenant branding info.
tenantsRouter.get("/config-by-domain", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const domain = req.query.domain as string;
    if (!domain) {
      return res.status(400).json({ status: "error", message: "Domain parameter is required." });
    }

    const tenantInfo = await getTenantByDomain(domain);
    if (!tenantInfo) {
      // It's not an error if a domain isn't found, the frontend will fallback.
      return res.status(404).json({ status: "not_found", message: "No tenant configured for this domain." });
    }

    // Load associated data for branding
    const flags = await loadPlanFlags(tenantInfo.planId);
    const brandingSnap = await db.collection('branding').doc(tenantInfo.theme).get();
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

  } catch (err) {
    logger.error("Failed to get tenant config by domain", { error: err });
    next(err);
  }
});

// New endpoint to create a tenant, protected for admins only.
tenantsRouter.post('/create', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantData = createTenantSchema.parse(req.body);

    // Generate a unique, URL-safe ID for the new tenant
    const tenantId = tenantData.name.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '') + '-' + randomUUID().substring(0, 4);

    const newTenantObject = {
      ...tenantData,
      plan: tenantData.planId,
      billingStatus: 'trial', // New tenants start on a trial
      createdAt: new Date().toISOString(),
    };

    await db.collection('tenants').doc(tenantId).set(newTenantObject);

    await recordAudit(
      "createTenant",
      req.user!.email!,
      `New tenant '${tenantData.name}' created by admin.`,
      { tenantId, traceId: req.traceId }
    );

    res.status(201).json({
      status: 'success',
      data: { id: tenantId, ...newTenantObject },
    });

  } catch (err) {
    logger.error('Failed to create new tenant', { error: err, traceId: req.traceId }, req);
    next(err);
  }
});

// =============================================================================
// TEAM MANAGEMENT
// =============================================================================

// Schema for inviting a member
const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member', 'viewer']),
});

// Schema for updating member role
const updateMemberRoleSchema = z.object({
  role: z.enum(['admin', 'member', 'viewer']),
});

// POST /tenants/invite - Invite a user to the tenant
tenantsRouter.post('/invite', requireAuth, withTenant, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, role } = inviteMemberSchema.parse(req.body);
    const tenantId = req.tenant!.info.id;

    // Limitation check: Validate max users per plan
    const plan = await loadPlan(req.tenant!.info.plan ?? "free");
    // Count existing members
    const membersSnap = await db.collection('tenants').doc(tenantId).collection('members').count().get();
    const currentMembers = membersSnap.data().count;

    // Count pending invites
    const invitesSnap = await db.collection('tenants').doc(tenantId).collection('invites').count().get();
    const currentInvites = invitesSnap.data().count;

    if (currentMembers + currentInvites >= plan.maxUsers) {
      return res.status(403).json({
        status: 'error',
        message: `Plan limit reached (${plan.maxUsers} users). Upgrade your plan to invite more members.`
      });
    }

    const inviteData = {
      email,
      role,
      invitedBy: req.user!.uid,
      invitedByEmail: req.user!.email,
      status: 'pending',
      createdAt: new Date().toISOString(),
      tenantId,
      tenantName: req.tenant!.info.name
    };

    // Create invite document
    const inviteRef = await db.collection('tenants').doc(tenantId).collection('invites').add(inviteData);

    await recordAudit(
      "inviteMember",
      req.user!.email!,
      `Invited ${email} as ${role}`,
      { tenantId, inviteId: inviteRef.id, traceId: req.traceId }
    );

    res.status(201).json({ status: 'success', id: inviteRef.id });
  } catch (err) {
    logger.error('Failed to invite member', { error: err }, req);
    next(err);
  }
});

// GET /tenants/members - List members and invites
tenantsRouter.get('/members', requireAuth, withTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenant!.info.id;

    const [membersSnap, invitesSnap] = await Promise.all([
      db.collection('tenants').doc(tenantId).collection('members').get(),
      db.collection('tenants').doc(tenantId).collection('invites').get()
    ]);

    const members = membersSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    const invites = invitesSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

    res.json({ status: 'success', data: { members, invites } });
  } catch (err) {
    next(err);
  }
});

// DELETE /tenants/members/:uid - Remove a member
tenantsRouter.delete('/members/:uid', requireAuth, withTenant, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { uid } = req.params;
    const tenantId = req.tenant!.info.id;

    if (uid === req.user!.uid) {
      return res.status(400).json({ status: 'error', message: 'Calculated safety: Cannot remove yourself.' });
    }

    // Remove from members subcollection
    await db.collection('tenants').doc(tenantId).collection('members').doc(uid).delete();

    await recordAudit(
      "removeMember",
      req.user!.email!,
      `Removed member ${uid}`,
      { tenantId, targetUid: uid, traceId: req.traceId }
    );

    res.json({ status: 'success' });
  } catch (err) {
    next(err);
  }
});

// DELETE /tenants/invites/:inviteId - Cancel invite
tenantsRouter.delete('/invites/:inviteId', requireAuth, withTenant, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { inviteId } = req.params;
    const tenantId = req.tenant!.info.id;

    await db.collection('tenants').doc(tenantId).collection('invites').doc(inviteId).delete();

    res.json({ status: 'success' });
  } catch (err) {
    next(err);
  }
});

// PATCH /tenants/members/:uid - Update member role
tenantsRouter.patch('/members/:uid', requireAuth, withTenant, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { uid } = req.params;
    const { role } = updateMemberRoleSchema.parse(req.body);
    const tenantId = req.tenant!.info.id;

    // Prevent changing owner role
    if (uid === req.tenant!.info.ownerUid) {
      return res.status(400).json({ status: 'error', message: 'Cannot change owner role.' });
    }

    // Verify member exists
    const memberRef = db.collection('tenants').doc(tenantId).collection('members').doc(uid);
    const memberSnap = await memberRef.get();
    if (!memberSnap.exists) {
      return res.status(404).json({ status: 'error', message: 'Member not found.' });
    }

    // Update member role
    await memberRef.update({ role });

    // Invalidate tenant cache
    invalidateTenantCache(tenantId);

    await recordAudit(
      "updateMemberRole",
      req.user!.email!,
      `Changed role of ${uid} to ${role}`,
      { tenantId, targetUid: uid, newRole: role, traceId: req.traceId }
    );

    logger.info('Member role updated', { tenantId, targetUid: uid, newRole: role, traceId: req.traceId });

    res.json({ status: 'success' });
  } catch (err) {
    logger.error('Failed to update member role', { error: err }, req);
    next(err);
  }
});

// GET /tenants/audit - List audit logs for the tenant
tenantsRouter.get('/audit', requireAuth, withTenant, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenant!.info.id;
    const limit = parseInt(req.query.limit as string) || 50;

    const snap = await db.collection('audit_logs')
      .where('tenantId', '==', tenantId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const logs = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

    res.json({ status: 'success', data: logs });
  } catch (err) {
    next(err);
  }
});
