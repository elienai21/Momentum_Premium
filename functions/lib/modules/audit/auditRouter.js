"use strict";
// functions/src/modules/audit/auditRouter.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const requireAuth_1 = require("../../middleware/requireAuth");
const withTenant_1 = require("../../middleware/withTenant");
const requireRole_1 = require("../../middleware/requireRole");
const auditService_1 = require("./auditService");
const errors_1 = require("../../utils/errors");
const logger_1 = require("../../utils/logger");
require("../../types");
exports.auditRouter = (0, express_1.Router)();
// Todas as rotas de auditoria exigem:
// - usuário autenticado
// - tenant carregado
// - role interno admin ou gestor (ou admin de plataforma)
exports.auditRouter.use(requireAuth_1.requireAuth, withTenant_1.withTenant, (0, requireRole_1.requireRole)(["admin", "gestor"]));
const querySchema = zod_1.z.object({
    limit: zod_1.z
        .string()
        .optional()
        .transform((v) => (v ? parseInt(v, 10) : undefined))
        .refine((v) => v === undefined || (!Number.isNaN(v) && v > 0 && v <= 500), "limit must be between 1 and 500"),
    from: zod_1.z.string().datetime().optional(),
    to: zod_1.z.string().datetime().optional(),
    userId: zod_1.z.string().min(1).optional(),
    type: zod_1.z.string().min(1).optional(),
});
/**
 * GET /api/audit/logs
 * Lista logs de auditoria do tenant corrente.
 *
 * Exemplos:
 *  - /api/audit/logs?limit=50
 *  - /api/audit/logs?from=2025-01-01T00:00:00.000Z&to=2025-01-31T23:59:59.999Z
 *  - /api/audit/logs?userId=abc123
 *  - /api/audit/logs?type=transaction.create
 */
exports.auditRouter.get("/logs", async (req, res, next) => {
    try {
        if (!req.tenant) {
            throw new errors_1.ApiError(400, "Tenant context required");
        }
        const parsed = querySchema.parse(req.query);
        const from = parsed.from ? new Date(parsed.from) : undefined;
        const to = parsed.to ? new Date(parsed.to) : undefined;
        const tenantId = req.tenant.id || req.tenant.info?.id || undefined;
        if (!tenantId) {
            throw new errors_1.ApiError(400, "Invalid tenant context");
        }
        const logs = await (0, auditService_1.listAuditLogs)(tenantId, {
            limit: parsed.limit,
            from,
            to,
            userId: parsed.userId,
            type: parsed.type,
        });
        res.json({
            status: "success",
            data: logs,
        });
    }
    catch (err) {
        logger_1.logger.error("Error listing audit logs", {
            error: err?.message,
            traceId: req?.traceId,
        });
        next(err);
    }
});
exports.default = exports.auditRouter;
