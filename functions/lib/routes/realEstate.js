"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.realEstateRouter = void 0;
// functions/src/routes/realEstate.ts
const express_1 = require("express");
const realEstateService_1 = require("../services/realEstateService");
const requireAuth_1 = require("../middleware/requireAuth");
const withTenant_1 = require("../middleware/withTenant");
const requireRole_1 = require("../middleware/requireRole");
const zod_1 = require("zod");
const auditService_1 = require("../modules/audit/auditService");
const realEstate_1 = require("../types/realEstate");
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
// Owners
const ownerSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    email: zod_1.z.string().email().optional(),
    phone: zod_1.z.string().optional(),
});
exports.realEstateRouter.get("/owners", async (req, res) => {
    const tenantId = req.tenant.info.id;
    const owners = await (0, realEstateService_1.listOwners)(tenantId);
    res.json({ ok: true, owners });
});
exports.realEstateRouter.post("/owners", async (req, res) => {
    const tenantId = req.tenant.info.id;
    const data = ownerSchema.parse(req.body);
    const owner = await (0, realEstateService_1.createOwner)(tenantId, data);
    res.json({ ok: true, owner });
});
// Units
const unitSchema = zod_1.z.object({
    code: zod_1.z.string().min(1),
    ownerId: zod_1.z.string().min(1),
    buildingId: zod_1.z.string().optional(),
    name: zod_1.z.string().optional(),
    bedrooms: zod_1.z.number().optional(),
    bathrooms: zod_1.z.number().optional(),
    nightlyRate: zod_1.z.number().optional(),
});
const contractSchema = zod_1.z.object({
    unitId: zod_1.z.string().min(1),
    tenantName: zod_1.z.string().min(1),
    startDate: zod_1.z.string().min(1),
    endDate: zod_1.z.string().min(1),
    rentAmount: zod_1.z.number().positive(),
    readjustmentIndex: zod_1.z.string().optional(),
});
exports.realEstateRouter.get("/units", async (req, res) => {
    const tenantId = req.tenant.info.id;
    const units = await (0, realEstateService_1.listUnits)(tenantId);
    res.json({ ok: true, units });
});
exports.realEstateRouter.post("/units", async (req, res) => {
    const tenantId = req.tenant.info.id;
    const data = unitSchema.parse(req.body);
    const unit = await (0, realEstateService_1.createUnit)(tenantId, data);
    res.json({ ok: true, unit });
});
// Contracts
exports.realEstateRouter.get("/contracts", async (req, res) => {
    const tenantId = req.tenant.info.id;
    const unitId = req.query.unitId || undefined;
    const contracts = await (0, realEstateService_1.listContracts)(tenantId, unitId);
    res.json({ ok: true, contracts });
});
exports.realEstateRouter.post("/contracts", async (req, res) => {
    const tenantId = req.tenant.info.id;
    const data = contractSchema.parse(req.body);
    const contract = await (0, realEstateService_1.createContract)(tenantId, data);
    res.json({ ok: true, contract });
});
exports.realEstateRouter.put("/contracts/:id", async (req, res) => {
    const tenantId = req.tenant.info.id;
    const data = contractSchema.partial().parse(req.body);
    await (0, realEstateService_1.updateContract)(tenantId, req.params.id, data);
    res.json({ ok: true });
});
exports.realEstateRouter.delete("/contracts/:id", async (req, res) => {
    const tenantId = req.tenant.info.id;
    await (0, realEstateService_1.deleteContract)(tenantId, req.params.id);
    res.json({ ok: true });
});
// Documents (stubs)
exports.realEstateRouter.post("/documents/init-upload", (0, requireRole_1.requireRole)(["admin", "finance", "editor"]), async (req, res, next) => {
    try {
        const tenantId = req.tenant.info.id;
        const parsed = realEstate_1.documentInitUploadSchema.parse(req.body);
        const result = await (0, realEstateService_1.initDocumentUpload)(tenantId, parsed, req.user);
        res.json({ ok: true, ...result });
    }
    catch (err) {
        next(err);
    }
});
exports.realEstateRouter.post("/documents/commit", (0, requireRole_1.requireRole)(["admin", "finance", "editor"]), async (req, res, next) => {
    try {
        const tenantId = req.tenant.info.id;
        const parsed = realEstate_1.documentCommitSchema.parse(req.body);
        const document = await (0, realEstateService_1.commitDocument)(tenantId, parsed, req.user);
        await (0, auditService_1.logActionFromRequest)(req, "realestate.document.upload", {
            entityId: parsed.linkedEntityId,
            docType: parsed.docType,
        });
        res.json({ ok: true, document });
    }
    catch (err) {
        next(err);
    }
});
exports.realEstateRouter.get("/documents", async (req, res, next) => {
    try {
        const tenantId = req.tenant.info.id;
        const parsed = realEstate_1.documentListQuerySchema.parse(req.query);
        const documents = await (0, realEstateService_1.listDocuments)(tenantId, parsed);
        res.json({ ok: true, documents });
    }
    catch (err) {
        next(err);
    }
});
// Statements (stubs)
exports.realEstateRouter.post("/statements/generate", (0, requireRole_1.requireRole)(["admin", "finance"]), async (req, res, next) => {
    try {
        const tenantId = req.tenant.info.id;
        const parsed = realEstate_1.generateStatementSchema.parse(req.body);
        const statement = await (0, realEstateService_1.generateOwnerStatement)(tenantId, parsed.ownerId, parsed.period, req.user?.uid);
        await (0, auditService_1.logActionFromRequest)(req, "realestate.statement.generated", {
            ownerId: parsed.ownerId,
            period: parsed.period,
        });
        res.json({ ok: true, statement });
    }
    catch (err) {
        next(err);
    }
});
exports.realEstateRouter.get("/statements", async (req, res, next) => {
    try {
        const tenantId = req.tenant.info.id;
        const parsed = realEstate_1.statementListQuerySchema.parse(req.query);
        const statements = await (0, realEstateService_1.listOwnerStatements)(tenantId, parsed.ownerId);
        res.json({ ok: true, statements });
    }
    catch (err) {
        next(err);
    }
});
// Receivables & analytics (stubs)
exports.realEstateRouter.post("/receivables/generate-batch", (0, requireRole_1.requireRole)(["admin", "finance"]), async (req, res, next) => {
    try {
        const tenantId = req.tenant.info.id;
        const parsed = realEstate_1.receivableGenerateBatchSchema.parse(req.body);
        const result = await (0, realEstateService_1.generateReceivablesBatch)(tenantId, parsed.period);
        res.json({ ok: true, ...result });
    }
    catch (err) {
        next(err);
    }
});
exports.realEstateRouter.get("/receivables", async (req, res, next) => {
    try {
        const tenantId = req.tenant.info.id;
        const parsed = realEstate_1.receivableListQuerySchema.parse(req.query);
        const receivables = await (0, realEstateService_1.listReceivables)(tenantId, parsed);
        res.json({ ok: true, receivables });
    }
    catch (err) {
        next(err);
    }
});
exports.realEstateRouter.post("/receivables/:id/payment", (0, requireRole_1.requireRole)(["admin", "finance"]), async (req, res, next) => {
    try {
        const tenantId = req.tenant.info.id;
        const bodySchema = zod_1.z.object({
            amount: zod_1.z.number().positive(),
            date: zod_1.z.string().min(1),
        });
        const parsed = bodySchema.parse(req.body);
        const receivable = await (0, realEstateService_1.recordPayment)(tenantId, req.params.id, parsed.amount, parsed.date);
        await (0, auditService_1.logActionFromRequest)(req, "realestate.payment.recorded", {
            receivableId: req.params.id,
            amount: parsed.amount,
        });
        res.json({ ok: true, receivable });
    }
    catch (err) {
        next(err);
    }
});
exports.realEstateRouter.get("/analytics/aging", async (req, res, next) => {
    try {
        const tenantId = req.tenant.info.id;
        realEstate_1.agingAnalyticsQuerySchema.parse(req.query ?? {});
        const existing = await (0, realEstateService_1.getAgingSnapshot)(tenantId);
        if (existing) {
            res.json({ ok: true, aging: existing });
            return;
        }
        const aging = await (0, realEstateService_1.calculateAgingSnapshot)(tenantId);
        res.json({ ok: true, aging });
    }
    catch (err) {
        next(err);
    }
});
exports.default = exports.realEstateRouter;
