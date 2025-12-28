import { db } from "src/services/firebase";
// ============================
// 🌐 Routes v1 — API Entry (v7.9.2 Clean Build)
// ============================

import { Router, Request, Response, NextFunction } from "express";
import { requireFeature } from "../middleware/requireFeature";
import { logger } from "../utils/logger";

import { accountsRouter } from "../modules/accounts";
import { goalsRouter } from "../modules/goals";
import { publicRouter } from "../modules/public";
import { syncRouter } from "../modules/sync";
import { supportRouter } from "../modules/support";

export const router = Router();

router.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info("API v1 request", {
    method: req.method,
    path: req.path,
    tenant: req.tenant?.info?.id,
  });
  next();
});

router.use("/accounts", requireFeature("accounts"), accountsRouter);
router.use("/goals", requireFeature("goals"), goalsRouter);
router.use("/public", publicRouter);
router.use("/sync", requireFeature("sync"), syncRouter);
router.use("/support", requireFeature("support"), supportRouter);

router.get("/health", (_req, res) => {
  res.json({ ok: true, version: "v1.0", ts: Date.now() });
});

router.use((_req, res) => {
  res.status(404).json({ ok: false, error: "Endpoint not found (v1)" });
});



