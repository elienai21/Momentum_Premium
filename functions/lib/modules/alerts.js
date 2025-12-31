"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = exports.alertsRouter = void 0;
const firebase_1 = require("../services/firebase");
// functions/src/modules/alerts.ts
const express_1 = require("express");
require("../types");
const requireAuth_1 = require("../middleware/requireAuth");
const withTenant_1 = require("../middleware/withTenant");
const errors_1 = require("../utils/errors");
exports.alertsRouter = (0, express_1.Router)();
exports.alertsRouter.use(requireAuth_1.requireAuth, withTenant_1.withTenant);
// GET /api/alerts — lista alertas do tenant
exports.alertsRouter.get("/", async (req, res, next) => {
    try {
        if (!req.tenant)
            throw new errors_1.ApiError(400, "Tenant context required.");
        const tenantId = req.tenant.info.id;
        const q = await firebase_1.db.collection(`tenants/${tenantId}/alerts`).orderBy("createdAt", "desc").limit(50).get();
        res.json({ ok: true, items: q.docs.map((d) => ({ id: d.id, ...d.data() })) });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/alerts/:id/read — marca lido
exports.alertsRouter.post("/:id/read", async (req, res, next) => {
    try {
        if (!req.tenant)
            throw new errors_1.ApiError(400, "Tenant context required.");
        const tenantId = req.tenant.info.id;
        const { id } = req.params;
        await firebase_1.db.doc(`tenants/${tenantId}/alerts/${id}`).update({ read: true });
        res.json({ ok: true });
    }
    catch (err) {
        next(err);
    }
});
exports.router = exports.alertsRouter;
