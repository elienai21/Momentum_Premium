import { db } from "src/services/firebase";
// functions/src/modules/alerts.ts
import { Router, Request, Response, NextFunction } from "express";
import "../types";

import { requireAuth } from "../middleware/requireAuth";
import { withTenant } from "../middleware/withTenant";
import { ApiError } from "../utils/errors";

export const alertsRouter = Router();
alertsRouter.use(requireAuth, withTenant);

// GET /api/alerts — lista alertas do tenant
alertsRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.tenant) throw new ApiError(400, "Tenant context required.");
    const tenantId = req.tenant.info.id;
    const q = await db.collection(`tenants/${tenantId}/alerts`).orderBy("createdAt", "desc").limit(50).get();
    res.json({ ok: true, items: q.docs.map((d: any) => ({ id: d.id, ...d.data() })) });
  } catch (err) {
    next(err);
  }
});

// POST /api/alerts/:id/read — marca lido
alertsRouter.post("/:id/read", async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.tenant) throw new ApiError(400, "Tenant context required.");
    const tenantId = req.tenant.info.id;
    const { id } = req.params;
    await db.doc(`tenants/${tenantId}/alerts/${id}`).update({ read: true });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export const router = alertsRouter;



