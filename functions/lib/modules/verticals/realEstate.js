"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.realEstateRouter = void 0;
// ============================
// 🏢 Vertical Module — Generic (v7.9.2)
// ============================
const express_1 = require("express");
const requireAuth_1 = require("../../middleware/requireAuth");
const requireFeature_1 = require("../../middleware/requireFeature");
exports.realEstateRouter = (0, express_1.Router)();
exports.realEstateRouter.use(requireAuth_1.requireAuth);
exports.realEstateRouter.get("/", (0, requireFeature_1.requireFeature)("real_estate"), async (_req, res) => {
    res.json({ ok: true, message: "Vertical Real Estate endpoint ativo." });
});
