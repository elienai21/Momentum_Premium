import { db } from "src/services/firebase";





import { Request, Response, NextFunction, Router } from "express";
// FIX: Add import for type augmentations
import "../types";

import { z } from "zod";
import { randomUUID } from "crypto";
import { getTenantByDomain } from "../core/tenants";
import { loadPlanFlags } from "../config/features";
import { logger } from "../utils/logger";
import { requireAuth } from "../middleware/requireAuth";
import { requireAdmin } from "../middleware/requireAdmin";
import { recordAudit } from "../core/audit";

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


