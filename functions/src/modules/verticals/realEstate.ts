import { db } from "src/services/firebase";
// ============================
// 🏢 Vertical Module — Generic (v7.9.2)
// ============================

import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth";
import { requireFeature } from "../../middleware/requireFeature";

export const realEstateRouter = Router();

realEstateRouter.use(requireAuth);
realEstateRouter.get("/", requireFeature("real_estate"), async (_req, res) => {
  res.json({ ok: true, message: "Vertical Real Estate endpoint ativo." });
});




