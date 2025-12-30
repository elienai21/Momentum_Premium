"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.portalRouter = void 0;
const firebase_1 = require("src/services/firebase");
const express_1 = require("express");
// FIX: Add import for type augmentations
require("../types");
const requireAuth_1 = require("../middleware/requireAuth");
const zod_1 = require("zod");
const errors_1 = require("../utils/errors");
const withTenant_1 = require("../middleware/withTenant");
const firestore_1 = require("../core/adapters/firestore");
const audit_1 = require("../core/audit");
exports.portalRouter = (0, express_1.Router)();
exports.portalRouter.use(requireAuth_1.requireAuth, withTenant_1.withTenant);
const getRecordsQuerySchema = zod_1.z.object({
    limit: zod_1.z.preprocess((val) => (val ? Number(val) : undefined), zod_1.z.number().int().positive().optional()),
    offset: zod_1.z.preprocess((val) => (val ? Number(val) : undefined), zod_1.z.number().int().nonnegative().optional()),
});
exports.portalRouter.get("/records", async (req, res, next) => {
    try {
        if (!req.tenant)
            throw new errors_1.ApiError(400, "Tenant context is required.");
        const options = getRecordsQuerySchema.parse(req.query);
        const db = new firestore_1.FirestoreAdapter(req.tenant.info.id);
        const data = await db.getRecords(options);
        res.json({ status: "success", data });
    }
    catch (err) {
        next(err);
    }
});
const addRecordBodySchema = zod_1.z.object({
    description: zod_1.z.string().min(1),
    amount: zod_1.z.number(),
    category: zod_1.z.string().min(1),
    type: zod_1.z.enum(["Income", "Expense"]),
    installments: zod_1.z.number().optional(),
    paymentMethod: zod_1.z.string().optional(),
    date: zod_1.z.string().optional(),
});
exports.portalRouter.post("/records", async (req, res, next) => {
    try {
        if (!req.tenant)
            throw new errors_1.ApiError(400, "Tenant context is required.");
        const tenantId = req.tenant.info.id;
        const record = addRecordBodySchema.parse(req.body);
        const db = new firestore_1.FirestoreAdapter(tenantId);
        const result = await db.addRecord(req.user.uid, record);
        await (0, audit_1.recordAudit)("addRecord", req.user.email, `Added ${result.count} new transaction(s) for '${record.description}'.`, { tenantId, traceId: req.traceId });
        if (result.needsReview) {
            res.status(201).json({
                status: "success",
                data: { count: result.count },
                message: `Transação registrada, mas o cartão '${result.paymentMethod}' não foi encontrado. Por favor, cadastre-o para gerenciar parcelas futuras.`
            });
        }
        else {
            res.status(201).json({ status: "success", data: { count: result.count } });
        }
    }
    catch (err) {
        next(err);
    }
});
exports.portalRouter.get("/dashboard", async (req, res, next) => {
    try {
        if (!req.tenant)
            throw new errors_1.ApiError(400, "Tenant context is required.");
        const db = new firestore_1.FirestoreAdapter(req.tenant.info.id);
        const data = await db.getDashboardData();
        res.json({ status: "success", data });
    }
    catch (err) {
        next(err);
    }
});
exports.portalRouter.get("/health-score", async (req, res, next) => {
    try {
        if (!req.tenant)
            throw new errors_1.ApiError(400, "Tenant context is required.");
        const docRef = firebase_1.db.collection(`tenants/${req.tenant.info.id}/insights`).doc("healthScore");
        const docSnap = await docRef.get();
        if (docSnap.exists) {
            res.json({ status: "success", data: docSnap.data() });
        }
        else {
            res.json({
                status: "success",
                data: { score: 0, aiComment: "Análise de saúde financeira ainda não disponível." },
            });
        }
    }
    catch (err) {
        next(err);
    }
});
