"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
// ============================
// 🌐 Routes v1 — API Entry (v7.9.2 Clean Build)
// ============================
const express_1 = require("express");
const requireFeature_1 = require("../middleware/requireFeature");
const logger_1 = require("../utils/logger");
const accounts_1 = require("../modules/accounts");
const goals_1 = require("../modules/goals");
const public_1 = require("../modules/public");
const sync_1 = require("../modules/sync");
const support_1 = require("../modules/support");
exports.router = (0, express_1.Router)();
exports.router.use((req, _res, next) => {
    logger_1.logger.info("API v1 request", {
        method: req.method,
        path: req.path,
        tenant: req.tenant?.info?.id,
    });
    next();
});
exports.router.use("/accounts", (0, requireFeature_1.requireFeature)("accounts"), accounts_1.accountsRouter);
exports.router.use("/goals", (0, requireFeature_1.requireFeature)("goals"), goals_1.goalsRouter);
exports.router.use("/public", public_1.publicRouter);
exports.router.use("/sync", (0, requireFeature_1.requireFeature)("sync"), sync_1.syncRouter);
exports.router.use("/support", (0, requireFeature_1.requireFeature)("support"), support_1.supportRouter);
exports.router.get("/health", (_req, res) => {
    res.json({ ok: true, version: "v1.0", ts: Date.now() });
});
exports.router.use((_req, res) => {
    res.status(404).json({ ok: false, error: "Endpoint not found (v1)" });
});
