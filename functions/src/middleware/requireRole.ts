// functions/src/middleware/requireRole.ts

import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/errors";
import { logger } from "../utils/logger";
import "../types"; // garante os tipos estendidos de req.user e req.tenant

type Role = "admin" | "gestor" | "operador" | string;

/**
 * Middleware de autorização baseado em papel interno do tenant.
 *
 * - allowed: um papel ou lista de papéis permitidos
 * - Admin de plataforma (req.user.isAdmin) sempre tem acesso.
 * - Usa req.tenant.role (definido em withTenant) para checar permissão.
 */
export function requireRole(allowed: Role[] | Role) {
  const allowedRoles = Array.isArray(allowed) ? allowed : [allowed];

  return (req: Request, _res: Response, next: NextFunction) => {
    const traceId = (req as any)?.traceId;

    if (!req.user) {
      logger.warn("requireRole: missing user in request", { traceId });
      return next(new ApiError(401, "Auth required"));
    }

    // Admin de plataforma sempre tem acesso
    if (req.user.isAdmin) {
      return next();
    }

    if (!req.tenant) {
      logger.warn("requireRole: missing tenant in request", { traceId, uid: req.user.uid });
      return next(new ApiError(400, "Tenant context required"));
    }

    const role = (req.tenant.role || "member") as Role;

    if (!allowedRoles.includes(role)) {
      logger.warn("requireRole: forbidden", {
        traceId,
        uid: req.user.uid,
        tenantId: req.tenant.id || req.tenant.info?.id,
        role,
        allowedRoles,
      });
      return next(new ApiError(403, "Forbidden: insufficient role"));
    }

    return next();
  };
}

export default requireRole;
