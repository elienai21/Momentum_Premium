"use strict";
// functions/src/modules/payments.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentsRouter = void 0;
const express_1 = require("express");
require("../types");
const requireAuth_1 = require("../middleware/requireAuth");
const withTenant_1 = require("../middleware/withTenant");
const errors_1 = require("../utils/errors");
const zod_1 = require("zod");
const batchPayments_1 = require("../core/logic/batchPayments");
const auditService_1 = require("./audit/auditService");
exports.paymentsRouter = (0, express_1.Router)();
// Todas as rotas de pagamentos exigem auth + tenant
exports.paymentsRouter.use(requireAuth_1.requireAuth, withTenant_1.withTenant);
// Query opcional para limitar quantidade de itens retornados
const pendingQuerySchema = zod_1.z.object({
    limit: zod_1.z
        .string()
        .optional()
        .transform((v) => (v ? parseInt(v, 10) : undefined))
        .refine((v) => v === undefined || (!Number.isNaN(v) && v > 0 && v <= 500), "limit must be between 1 and 500"),
});
// Lista pagamentos pendentes do tenant
exports.paymentsRouter.get("/pending", async (req, res, next) => {
    try {
        if (!req.tenant)
            throw new errors_1.ApiError(400, "Tenant context required");
        const parsed = pendingQuerySchema.parse(req.query);
        const limit = parsed.limit;
        const tenantId = req.tenant.info.id;
        // ✅ A função getPendingPayments aceita APENAS 1 argumento (tenantId)
        const allItems = await (0, batchPayments_1.getPendingPayments)(tenantId);
        const items = limit ? allItems.slice(0, limit) : allItems;
        // 🔎 Auditoria: listagem de pendências
        await (0, auditService_1.logActionFromRequest)(req, "payment.pending.list", {
            tenantId,
            limit,
            returned: items.length,
        });
        res.json({ status: "success", data: items });
    }
    catch (err) {
        next(err);
    }
});
const confirmSchema = zod_1.z.object({
    ids: zod_1.z.array(zod_1.z.string().min(1)),
});
// Confirma pagamentos em lote
exports.paymentsRouter.post("/confirm", async (req, res, next) => {
    try {
        if (!req.tenant)
            throw new errors_1.ApiError(400, "Tenant context required");
        const { ids } = confirmSchema.parse(req.body);
        const tenantId = req.tenant.info.id;
        const result = await (0, batchPayments_1.confirmPayments)(tenantId, ids);
        // 🔎 Auditoria: confirmação em lote
        await (0, auditService_1.logActionFromRequest)(req, "payment.confirm", {
            tenantId,
            ids,
            count: ids.length,
        });
        res.json({ status: "success", data: result });
    }
    catch (err) {
        next(err);
    }
});
exports.default = exports.paymentsRouter;
