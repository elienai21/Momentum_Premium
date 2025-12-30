"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.accountsRouter = void 0;
const firebase_1 = require("src/services/firebase");
// ============================
// 💼 Accounts Module — v7.9+ com auditoria nova
// ============================
const express_1 = require("express");
require("../../types");
const zod_1 = require("zod");
const requireAuth_1 = require("../../middleware/requireAuth");
const withTenant_1 = require("../../middleware/withTenant");
// Mantém seu requireRole existente
const requireRole_1 = require("../../security/requireRole");
const errors_1 = require("../../utils/errors");
const reconcileAccounts_1 = require("../../ai/reconcileAccounts");
const exportAccountsReport_1 = require("../../reports/exportAccountsReport");
// 🔎 Novo: usa o sistema de auditoria unificado
const auditService_1 = require("../audit/auditService");
exports.accountsRouter = (0, express_1.Router)();
exports.accountsRouter.use(requireAuth_1.requireAuth, withTenant_1.withTenant);
// ============================
// 🔹 Schemas
// ============================
const createAccountSchema = zod_1.z.object({
    type: zod_1.z.enum(["payable", "receivable"]),
    description: zod_1.z.string().min(3),
    amount: zod_1.z.number().positive(),
    dueDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
    method: zod_1.z.string().optional(),
    reference: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
});
const accountReviewSchema = zod_1.z.object({
    notes: zod_1.z.string().optional(),
});
// ============================
// 🧾 Create a new account
// ============================
exports.accountsRouter.post("/", (0, requireRole_1.requireRole)("admin"), async (req, res, next) => {
    try {
        if (!req.tenant)
            throw new errors_1.ApiError(400, "Tenant context is required.");
        const tenantId = req.tenant.info.id;
        const data = createAccountSchema.parse(req.body);
        const dualValidation = req.tenant.info.features?.dualValidation || false;
        const newAccount = {
            ...data,
            status: "pending",
            dualValidation,
            createdAt: new Date().toISOString(),
        };
        const docRef = await firebase_1.db
            .collection(`tenants/${tenantId}/accounts`)
            .add(newAccount);
        // 🔎 Auditoria unificada
        await (0, auditService_1.logActionFromRequest)(req, "account.create", {
            tenantId,
            accountId: docRef.id,
            description: data.description,
            amount: data.amount,
            type: data.type,
        });
        res
            .status(201)
            .json({ status: "success", data: { id: docRef.id, ...newAccount } });
    }
    catch (err) {
        next(err);
    }
});
// ============================
// 🧩 Review (first validation)
// ============================
exports.accountsRouter.post("/:accountId/review", (0, requireRole_1.requireRole)("admin"), async (req, res, next) => {
    try {
        if (!req.tenant)
            throw new errors_1.ApiError(400, "Tenant context is required.");
        const tenantId = req.tenant.info.id;
        const userEmail = req?.user?.email ?? "anonymous";
        const { accountId } = req.params;
        const { notes } = accountReviewSchema.parse(req.body);
        const ref = firebase_1.db.doc(`tenants/${tenantId}/accounts/${accountId}`);
        const doc = await ref.get();
        if (!doc.exists)
            throw new errors_1.ApiError(404, "Account not found.");
        const account = doc.data();
        if (account.status !== "pending" && account.status !== "overdue") {
            throw new errors_1.ApiError(400, `Cannot review an account with status '${account.status}'.`);
        }
        if (account.dualValidation) {
            await ref.update({
                status: "under_review",
                reviewedBy: userEmail,
                notes,
            });
            await (0, auditService_1.logActionFromRequest)(req, "account.review", {
                tenantId,
                accountId,
                description: account.description,
                amount: account.amount,
                dualValidation: account.dualValidation,
            });
            res.json({
                status: "success",
                message: "Account reviewed, awaiting final approval.",
            });
        }
        else {
            await ref.update({
                status: "paid",
                paidAt: new Date().toISOString(),
                approvedBy: userEmail,
                notes,
            });
            await (0, auditService_1.logActionFromRequest)(req, "account.pay.single", {
                tenantId,
                accountId,
                description: account.description,
                amount: account.amount,
                dualValidation: account.dualValidation,
            });
            res.json({ status: "success", message: "Account marked as paid." });
        }
    }
    catch (err) {
        next(err);
    }
});
// ============================
// ✅ Approval (final step)
// ============================
exports.accountsRouter.post("/:accountId/approve", (0, requireRole_1.requireRole)("admin"), async (req, res, next) => {
    try {
        if (!req.tenant)
            throw new errors_1.ApiError(400, "Tenant context is required.");
        const tenantId = req.tenant.info.id;
        const userEmail = req?.user?.email ?? "anonymous";
        const { accountId } = req.params;
        const ref = firebase_1.db.doc(`tenants/${tenantId}/accounts/${accountId}`);
        const doc = await ref.get();
        if (!doc.exists)
            throw new errors_1.ApiError(404, "Account not found.");
        const account = doc.data();
        if (!account.dualValidation)
            throw new errors_1.ApiError(400, "This account does not require dual validation approval.");
        if (account.status !== "under_review") {
            throw new errors_1.ApiError(400, `Cannot approve an account with status '${account.status}'.`);
        }
        if (account.reviewedBy === userEmail) {
            throw new errors_1.ApiError(403, "The same user who reviewed cannot approve.");
        }
        await ref.update({
            status: "paid",
            approvedBy: userEmail,
            paidAt: new Date().toISOString(),
        });
        await (0, auditService_1.logActionFromRequest)(req, "account.approve", {
            tenantId,
            accountId,
            description: account.description,
            amount: account.amount,
        });
        res.json({ status: "success", message: "Payment approved and finalized." });
    }
    catch (err) {
        next(err);
    }
});
// ============================
// 📋 List accounts
// ============================
exports.accountsRouter.get("/", async (req, res, next) => {
    try {
        if (!req.tenant)
            throw new errors_1.ApiError(400, "Tenant context is required.");
        let query = firebase_1.db
            .collection(`tenants/${req.tenant.info.id}/accounts`)
            .orderBy("dueDate", "asc");
        if (req.query.status)
            query = query.where("status", "==", req.query.status);
        if (req.query.type)
            query = query.where("type", "==", req.query.type);
        if (req.query.start)
            query = query.where("dueDate", ">=", req.query.start);
        if (req.query.end)
            query = query.where("dueDate", "<=", req.query.end);
        if (req.query.dueDate === "today") {
            const today = new Date().toISOString().split("T")[0];
            query = query.where("dueDate", "==", today);
        }
        const snapshot = await query.limit(100).get();
        const accounts = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
        // 🔎 Auditoria de listagem
        await (0, auditService_1.logActionFromRequest)(req, "account.list", {
            count: accounts.length,
            status: req.query.status,
            type: req.query.type,
        });
        res.json({ status: "success", data: accounts });
    }
    catch (err) {
        next(err);
    }
});
// ============================
// 🤖 AI Reconciliation
// ============================
const reconcileSchema = zod_1.z.object({ statementText: zod_1.z.string().min(10) });
exports.accountsRouter.post("/reconcile", (0, requireRole_1.requireRole)("admin"), async (req, res, next) => {
    try {
        if (!req.tenant)
            throw new errors_1.ApiError(400, "Tenant context is required.");
        const tenantId = req.tenant.info.id;
        if (!req.tenant.flags.aiReconciliation)
            throw new errors_1.ApiError(403, "AI reconciliation feature not enabled.");
        const { statementText } = reconcileSchema.parse(req.body);
        const result = await (0, reconcileAccounts_1.reconcileAccounts)(tenantId, statementText);
        await (0, auditService_1.logActionFromRequest)(req, "account.reconcile.ai", {
            tenantId,
            matches: result.matches?.length ?? 0,
            updatedCount: result.updatedCount,
        });
        res.json({ status: "success", data: result });
    }
    catch (err) {
        next(err);
    }
});
// ============================
// 📤 Export CSV Report
// ============================
exports.accountsRouter.get("/export.csv", (0, requireRole_1.requireRole)("admin"), async (req, res, next) => {
    try {
        if (!req.tenant)
            throw new errors_1.ApiError(400, "Tenant context is required.");
        const tenantId = req.tenant.info.id;
        if (!req.tenant.flags.pdfExport)
            throw new errors_1.ApiError(403, "CSV/PDF export feature not enabled.");
        const options = {
            status: req.query.status,
            type: req.query.type,
        };
        const tenantName = req.tenant.info.name || tenantId;
        const csvData = await (0, exportAccountsReport_1.exportAccountsReport)(tenantId, tenantName, options);
        await (0, auditService_1.logActionFromRequest)(req, "account.export.csv", {
            tenantId,
            filters: options,
        });
        res.header("Content-Type", "text/csv");
        res.attachment("report.csv");
        res.send(csvData);
    }
    catch (err) {
        next(err);
    }
});
// ============================
// 🧾 Batch confirmation
// ============================
exports.accountsRouter.post("/confirm-batch", (0, requireRole_1.requireRole)("admin"), async (req, res, next) => {
    try {
        if (!req.tenant)
            throw new errors_1.ApiError(400, "Tenant context is required.");
        const tenantId = req.tenant.info.id;
        const userEmail = req?.user?.email ?? "anonymous";
        const { ids } = zod_1.z
            .object({ ids: zod_1.z.array(zod_1.z.string()).min(1) })
            .parse(req.body);
        const batch = firebase_1.db.batch();
        const collectionRef = firebase_1.db.collection(`tenants/${tenantId}/accounts`);
        const now = new Date().toISOString();
        ids.forEach((id) => {
            batch.update(collectionRef.doc(id), {
                status: "paid",
                paidAt: now,
                approvedBy: userEmail,
            });
        });
        await batch.commit();
        await (0, auditService_1.logActionFromRequest)(req, "account.confirm.batch", {
            tenantId,
            count: ids.length,
            accountIds: ids,
        });
        res.json({ status: "success", data: { count: ids.length } });
    }
    catch (err) {
        next(err);
    }
});
exports.default = exports.accountsRouter;
