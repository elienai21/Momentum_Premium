"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.realEstateRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const requireAuth_1 = require("../middleware/requireAuth");
const requireFeature_1 = require("../middleware/requireFeature");
const realEstateService_1 = require("../services/realEstateService");
function getTenantId(req) {
    return (req.tenant?.info?.id ||
        req.user?.tenantId ||
        req.query?.tenantId ||
        null);
}
exports.realEstateRouter = (0, express_1.Router)();
exports.realEstateRouter.use(requireAuth_1.requireAuth);
exports.realEstateRouter.use((0, requireFeature_1.requireFeature)("real_estate"));
const staysCsvSchema = zod_1.z.object({
    unitCode: zod_1.z.string().min(1),
    checkIn: zod_1.z.string().min(1),
    checkOut: zod_1.z.string().min(1),
    nights: zod_1.z.number().int().positive().optional(),
    grossRevenue: zod_1.z.number().optional(),
    cleaningFees: zod_1.z.number().optional(),
    platformFees: zod_1.z.number().optional(),
    otherCosts: zod_1.z.number().optional(),
    source: zod_1.z.string().optional(),
    bookingId: zod_1.z.string().optional(),
    guestName: zod_1.z.string().optional(),
    guestEmail: zod_1.z.string().optional(),
    guestPhone: zod_1.z.string().optional(),
    createdAt: zod_1.z.string().optional(),
    raw: zod_1.z.record(zod_1.z.any()).optional(),
});
const expensePayloadSchema = zod_1.z.object({
    unitCode: zod_1.z.string().min(1),
    category: zod_1.z.string().min(1),
    amount: zod_1.z.number().positive(),
    incurredAt: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    vendor: zod_1.z.string().optional(),
    source: zod_1.z.string().optional(),
});
exports.realEstateRouter.post("/owners", async (req, res) => {
    const tenantId = getTenantId(req);
    if (!tenantId)
        return res.status(400).json({ ok: false, error: "tenant_required" });
    const { name, email, phone, taxId } = req.body || {};
    const owner = await (0, realEstateService_1.createOwner)(tenantId, { name, email, phone, taxId });
    res.json({ ok: true, owner });
});
exports.realEstateRouter.get("/owners", async (req, res) => {
    const tenantId = getTenantId(req);
    if (!tenantId)
        return res.status(400).json({ ok: false, error: "tenant_required" });
    const owners = await (0, realEstateService_1.listOwners)(tenantId);
    res.json({ ok: true, owners });
});
exports.realEstateRouter.post("/units", async (req, res) => {
    const tenantId = getTenantId(req);
    if (!tenantId)
        return res.status(400).json({ ok: false, error: "tenant_required" });
    const { ownerId, code, name, bedrooms, bathrooms, nightlyRate } = req.body || {};
    const unit = await (0, realEstateService_1.createUnit)(tenantId, {
        ownerId,
        code,
        name,
        bedrooms,
        bathrooms,
        nightlyRate,
    });
    res.json({ ok: true, unit });
});
exports.realEstateRouter.get("/units", async (req, res) => {
    const tenantId = getTenantId(req);
    if (!tenantId)
        return res.status(400).json({ ok: false, error: "tenant_required" });
    const units = await (0, realEstateService_1.listUnits)(tenantId);
    res.json({ ok: true, units });
});
exports.realEstateRouter.post("/stays", async (req, res) => {
    const tenantId = getTenantId(req);
    if (!tenantId)
        return res.status(400).json({ ok: false, error: "tenant_required" });
    try {
        const payload = staysCsvSchema.parse(req.body);
        const stay = await (0, realEstateService_1.registerStayFromStaysCsv)(tenantId, payload);
        res.json({ ok: true, stay });
    }
    catch (err) {
        const status = err?.statusCode || 400;
        res.status(status).json({ ok: false, error: err?.message || "invalid_request" });
    }
});
exports.realEstateRouter.post("/expenses", async (req, res) => {
    const tenantId = getTenantId(req);
    if (!tenantId)
        return res.status(400).json({ ok: false, error: "tenant_required" });
    try {
        const payload = expensePayloadSchema.parse(req.body);
        const expense = await (0, realEstateService_1.registerExpenseFromPayload)(tenantId, payload);
        res.json({ ok: true, expense });
    }
    catch (err) {
        const status = err?.statusCode || 400;
        res.status(status).json({ ok: false, error: err?.message || "invalid_request" });
    }
});
exports.realEstateRouter.get("/statements/:ownerId", async (req, res) => {
    const tenantId = getTenantId(req);
    if (!tenantId)
        return res.status(400).json({ ok: false, error: "tenant_required" });
    const ownerId = req.params.ownerId;
    const month = req.query?.month;
    if (!ownerId)
        return res.status(400).json({ ok: false, error: "owner_required" });
    if (!month)
        return res.status(400).json({ ok: false, error: "month_required" });
    try {
        const statement = await (0, realEstateService_1.getOrGenerateMonthlyStatement)(tenantId, ownerId, month);
        res.json({ ok: true, statement });
    }
    catch (err) {
        const status = err?.statusCode || 500;
        res.status(status).json({ ok: false, error: err?.message || "statement_error" });
    }
});
exports.realEstateRouter.get("/stays/:unitId", async (req, res) => {
    const tenantId = getTenantId(req);
    if (!tenantId)
        return res.status(400).json({ ok: false, error: "tenant_required" });
    const unitId = req.params.unitId;
    const stays = await (0, realEstateService_1.listStaysByUnit)(tenantId, unitId);
    res.json({ ok: true, stays });
});
exports.realEstateRouter.get("/expenses/:unitId", async (req, res) => {
    const tenantId = getTenantId(req);
    if (!tenantId)
        return res.status(400).json({ ok: false, error: "tenant_required" });
    const unitId = req.params.unitId;
    const expenses = await (0, realEstateService_1.listExpensesByUnit)(tenantId, unitId);
    res.json({ ok: true, expenses });
});
exports.default = exports.realEstateRouter;
