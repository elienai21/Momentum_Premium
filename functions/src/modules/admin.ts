import { db } from "src/services/firebase";

import { Request, Response, NextFunction, Router } from "express";
// FIX: Add import for type augmentations
import "../types";

import { requireAuth } from "../middleware/requireAuth";
import { requireAdmin } from "../middleware/requireAdmin";
import { ApiError } from "../utils/errors";
import { withTenant } from "../middleware/withTenant";
import { FirestoreAdapter } from "../core/adapters/firestore";

export const adminRouter = Router();

// All admin routes require authentication and admin privileges
adminRouter.use(requireAuth, requireAdmin);

adminRouter.get("/analytics", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = new FirestoreAdapter();
    const tenants = await db.getAllTenants();
    const usageData = await Promise.all(
      tenants.map(t => db.getTenantUsageAnalytics(t.id))
    );
    const totalTransactions = usageData.reduce((sum, current) => sum + current.transactionCount, 0);

    res.json({
        status: "success",
        data: {
            tenantCount: tenants.length,
            totalTransactions,
        },
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/clients", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = new FirestoreAdapter();
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
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/check-setup", withTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.tenant) throw new ApiError(400, "Tenant context is required for setup check.");
    const db = new FirestoreAdapter();
    const result = await db.checkTenantSetup(req.tenant.info.id);
    res.json({ status: "success", data: result });
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/usage-report/:tenantId", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { tenantId } = req.params;
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        const snap = await db.collection('usage_logs')
            .where('tenantId', '==', tenantId)
            .where('createdAt', '>=', startOfMonth)
            .get();

        let totalTokens = 0;
        const usageByKind: Record<string, number> = {};

        snap.docs.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
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
    } catch (err) {
        next(err);
    }
});

