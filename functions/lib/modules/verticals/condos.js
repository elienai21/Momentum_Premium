"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.condosRouter = void 0;
// ============================
// 🏢 Vertical Module — Generic (v7.9.2)
// ============================
const express_1 = require("express");
const requireAuth_1 = require("../../middleware/requireAuth");
const requireFeature_1 = require("../../middleware/requireFeature");
exports.condosRouter = (0, express_1.Router)();
exports.condosRouter.use(requireAuth_1.requireAuth);
exports.condosRouter.get("/", (0, requireFeature_1.requireFeature)("condos"), async (_req, res) => {
    res.json({ ok: true, message: "Vertical Condos endpoint ativo." });
});
