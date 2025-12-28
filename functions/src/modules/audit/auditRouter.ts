// functions/src/modules/audit/auditRouter.ts

import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/requireAuth";
import { withTenant } from "../../middleware/withTenant";
import { requireRole } from "../../middleware/requireRole";
import { listAuditLogs } from "./auditService";
import { ApiError } from "../../utils/errors";
import { logger } from "../../utils/logger";
import "../../types";

export const auditRouter = Router();

// Todas as rotas de auditoria exigem:
// - usuário autenticado
// - tenant carregado
// - role interno admin ou gestor (ou admin de plataforma)
auditRouter.use(requireAuth, withTenant, requireRole(["admin", "gestor"]));

const querySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : undefined))
    .refine(
      (v) => v === undefined || (!Number.isNaN(v) && v > 0 && v <= 500),
      "limit must be between 1 and 500"
    ),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  userId: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
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
auditRouter.get(
  "/logs",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.tenant) {
        throw new ApiError(400, "Tenant context required");
      }

      const parsed = querySchema.parse(req.query);

      const from = parsed.from ? new Date(parsed.from) : undefined;
      const to = parsed.to ? new Date(parsed.to) : undefined;

      const tenantId =
        (req.tenant as any).id || (req.tenant as any).info?.id || undefined;

      if (!tenantId) {
        throw new ApiError(400, "Invalid tenant context");
      }

      const logs = await listAuditLogs(tenantId, {
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
    } catch (err) {
      logger.error("Error listing audit logs", {
        error: (err as any)?.message,
        traceId: (req as any)?.traceId,
      });
      next(err);
    }
  }
);

export default auditRouter;
