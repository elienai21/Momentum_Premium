"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.realEstateRouter = void 0;
// functions/src/routes/realEstate.ts
const express_1 = require("express");
const realEstateService_1 = require("../services/realEstateService");
const requireAuth_1 = require("../middleware/requireAuth");
const withTenant_1 = require("../middleware/withTenant");
const zod_1 = require("zod");
exports.realEstateRouter = (0, express_1.Router)();
exports.realEstateRouter.use(requireAuth_1.requireAuth, withTenant_1.withTenant);
// Buildings
exports.realEstateRouter.get("/buildings", async (req, res) => {
    const tenantId = req.tenant.info.id;
    const buildings = await (0, realEstateService_1.listBuildings)(tenantId);
    res.json({ ok: true, buildings });
});
const buildingSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    address: zod_1.z.string().optional(),
    city: zod_1.z.string().optional(),
    state: zod_1.z.string().optional(),
    zipCode: zod_1.z.string().optional(),
});
exports.realEstateRouter.post("/buildings", async (req, res) => {
    const tenantId = req.tenant.info.id;
    const data = buildingSchema.parse(req.body);
    const building = await (0, realEstateService_1.createBuilding)(tenantId, data);
    res.json({ ok: true, building });
});
exports.realEstateRouter.put("/buildings/:id", async (req, res) => {
    const tenantId = req.tenant.info.id;
    const data = buildingSchema.partial().parse(req.body);
    await (0, realEstateService_1.updateBuilding)(tenantId, req.params.id, data);
    res.json({ ok: true });
});
exports.realEstateRouter.delete("/buildings/:id", async (req, res) => {
    const tenantId = req.tenant.info.id;
    await (0, realEstateService_1.archiveBuilding)(tenantId, req.params.id);
    res.json({ ok: true });
});
// Summary
exports.realEstateRouter.get("/portfolio-summary", async (req, res) => {
    const tenantId = req.tenant.info.id;
    const days = parseInt(req.query.days) || 30;
    const summary = await (0, realEstateService_1.getPortfolioSummary)(tenantId, days);
    res.json({ ok: true, summary });
});
// Listing units and owners (already existing in service, exposing here for completeness if needed)
exports.realEstateRouter.get("/owners", async (req, res) => {
    const tenantId = req.tenant.info.id;
    const owners = await (0, realEstateService_1.listOwners)(tenantId);
    res.json({ ok: true, owners });
});
exports.realEstateRouter.get("/units", async (req, res) => {
    const tenantId = req.tenant.info.id;
    const units = await (0, realEstateService_1.listUnits)(tenantId);
    res.json({ ok: true, units });
});
exports.default = exports.realEstateRouter;
