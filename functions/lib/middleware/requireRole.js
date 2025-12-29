"use strict";
// functions/src/middleware/requireRole.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = requireRole;
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
require("../types"); // garante os tipos estendidos de req.user e req.tenant
/**
 * Middleware de autorização baseado em papel interno do tenant.
 *
 * - allowed: um papel ou lista de papéis permitidos
 * - Admin de plataforma (req.user.isAdmin) sempre tem acesso.
 * - Usa req.tenant.role (definido em withTenant) para checar permissão.
 */
function requireRole(allowed) {
    const allowedRoles = Array.isArray(allowed) ? allowed : [allowed];
    return (req, _res, next) => {
        const traceId = req?.traceId;
        if (!req.user) {
            logger_1.logger.warn("requireRole: missing user in request", { traceId });
            return next(new errors_1.ApiError(401, "Auth required"));
        }
        // Admin de plataforma sempre tem acesso
        if (req.user.isAdmin) {
            return next();
        }
        if (!req.tenant) {
            logger_1.logger.warn("requireRole: missing tenant in request", { traceId, uid: req.user.uid });
            return next(new errors_1.ApiError(400, "Tenant context required"));
        }
        const role = (req.tenant.role || "member");
        if (!allowedRoles.includes(role)) {
            logger_1.logger.warn("requireRole: forbidden", {
                traceId,
                uid: req.user.uid,
                tenantId: req.tenant.id || req.tenant.info?.id,
                role,
                allowedRoles,
            });
            return next(new errors_1.ApiError(403, "Forbidden: insufficient role"));
        }
        return next();
    };
}
exports.default = requireRole;
