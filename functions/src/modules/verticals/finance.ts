import { Router } from "express";
// ============================
// 🏢 Vertical Module — Finance (v7.9.2)
// ============================

import { requireAuth } from "../../middleware/requireAuth";
import { requireFeature } from "../../middleware/requireFeature";
import { withTenant } from "../../middleware/withTenant";

export const financeRouter = Router();

// Todas as rotas de finanças exigem auth + tenant
financeRouter.use(requireAuth, withTenant);

/**
 * Endpoint de saúde da vertical Finance.
 * Útil para testes e monitoramento.
 */
financeRouter.get("/", requireFeature("finance"), async (_req, res) => {
  res.json({ ok: true, message: "Vertical Finance endpoint ativo." });
});

export default financeRouter;
