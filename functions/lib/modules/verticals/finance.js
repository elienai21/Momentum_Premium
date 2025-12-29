"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.financeRouter = void 0;
const express_1 = require("express");
// ============================
// 🏢 Vertical Module — Finance (v7.9.2)
// ============================
const requireAuth_1 = require("../../middleware/requireAuth");
const requireFeature_1 = require("../../middleware/requireFeature");
const withTenant_1 = require("../../middleware/withTenant");
exports.financeRouter = (0, express_1.Router)();
// Todas as rotas de finanças exigem auth + tenant
exports.financeRouter.use(requireAuth_1.requireAuth, withTenant_1.withTenant);
/**
 * Endpoint de saúde da vertical Finance.
 * Útil para testes e monitoramento.
 */
exports.financeRouter.get("/", (0, requireFeature_1.requireFeature)("finance"), async (_req, res) => {
    res.json({ ok: true, message: "Vertical Finance endpoint ativo." });
});
exports.default = exports.financeRouter;
