// functions/src/modules/payments.ts

import { Router, Request, Response, NextFunction } from "express";
import "../types";
import { requireAuth } from "../middleware/requireAuth";
import { withTenant } from "../middleware/withTenant";
import { ApiError } from "../utils/errors";
import { z } from "zod";
import { getPendingPayments, confirmPayments } from "../core/logic/batchPayments";
import { logActionFromRequest } from "./audit/auditService";

export const paymentsRouter = Router();

// Todas as rotas de pagamentos exigem auth + tenant
paymentsRouter.use(requireAuth, withTenant);

// Query opcional para limitar quantidade de itens retornados
const pendingQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : undefined))
    .refine(
      (v) => v === undefined || (!Number.isNaN(v) && v > 0 && v <= 500),
      "limit must be between 1 and 500"
    ),
});

// Lista pagamentos pendentes do tenant
paymentsRouter.get(
  "/pending",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.tenant) throw new ApiError(400, "Tenant context required");

      const parsed = pendingQuerySchema.parse(req.query);
      const limit = parsed.limit;
      const tenantId = req.tenant.info.id;

      // ✅ A função getPendingPayments aceita APENAS 1 argumento (tenantId)
      const allItems = await getPendingPayments(tenantId);
      const items = limit ? allItems.slice(0, limit) : allItems;

      // 🔎 Auditoria: listagem de pendências
      await logActionFromRequest(req, "payment.pending.list", {
        tenantId,
        limit,
        returned: items.length,
      });

      res.json({ status: "success", data: items });
    } catch (err) {
      next(err);
    }
  }
);

const confirmSchema = z.object({
  ids: z.array(z.string().min(1)),
});

// Confirma pagamentos em lote
paymentsRouter.post(
  "/confirm",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.tenant) throw new ApiError(400, "Tenant context required");

      const { ids } = confirmSchema.parse(req.body);
      const tenantId = req.tenant.info.id;

      const result = await confirmPayments(tenantId, ids);

      // 🔎 Auditoria: confirmação em lote
      await logActionFromRequest(req, "payment.confirm", {
        tenantId,
        ids,
        count: ids.length,
      });

      res.json({ status: "success", data: result });
    } catch (err) {
      next(err);
    }
  }
);

export default paymentsRouter;
