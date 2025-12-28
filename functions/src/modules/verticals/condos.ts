import { db } from "src/services/firebase";
// ============================
// 🏢 Vertical Module — Generic (v7.9.2)
// ============================

import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth";
import { requireFeature } from "../../middleware/requireFeature";

export const condosRouter = Router();

condosRouter.use(requireAuth);
condosRouter.get("/", requireFeature("condos"), async (_req, res) => {
  res.json({ ok: true, message: "Vertical Condos endpoint ativo." });
});




