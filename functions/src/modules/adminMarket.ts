// functions/src/modules/adminMarket.ts
import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";

// ✅ Middlewares do seu projeto (pasta singular "middleware")
import { withTenant } from "../middleware/withTenant";
import { requireFeature } from "../middleware/requireFeature";

// ✅ Service que você vai criar (ou já existe)
import {
  getMarketConfig,
  upsertMarketConfig,
  type MarketConfig,
} from "../services/marketConfigService";

// (Opcional) Logger central; se não existir, o TS pode ser ajustado para usar console
import { logger } from "../lib/logger";

export const adminMarketRouter = Router();

/** Guard mínimo de autenticação (caso o withTenant não valide sozinho). */
function ensureAuth(req: Request, res: Response, next: NextFunction) {
  const uid =
    (req as any)?.user?.uid ??
    (req as any)?.auth?.uid ??
    (req as any)?.firebaseUser?.uid;

  if (!uid) {
    return res.status(401).json({
      ok: false,
      code: "UNAUTHENTICATED",
      message: "Usuário não autenticado.",
    });
  }
  (req as any).uid = uid;
  next();
}

/** Validação do payload de MarketConfig */
const marketConfigBodySchema = z.object({
  enabled: z.boolean().optional().default(true),
  sector: z.string().trim().min(1, "sector é obrigatório"),
  region: z.string().trim().min(1, "region é obrigatório"),
  companySize: z.string().trim().min(1, "companySize é obrigatório"),
  horizon: z.enum(["30d", "90d"]).optional(),
});

function badRequest(res: Response, message: string, issues?: unknown) {
  return res.status(400).json({ ok: false, code: "BAD_REQUEST", message, issues });
}

/**
 * GET /tenant/:tenantId/market-config
 * Retorna a configuração (ou default, se ainda não existir)
 */
adminMarketRouter.get(
  "/tenant/:tenantId/market-config",
  ensureAuth,
  withTenant,
  // opcional: exigir feature específica, se desejar
  // requireFeature("market.config:read"),
  async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.params;
      const data: MarketConfig = await getMarketConfig(tenantId);
      return res.status(200).json({ ok: true, data });
    } catch (err: any) {
      (logger ?? console).error?.("admin.market-config.get.error", {
        tenantId: req.params?.tenantId,
        error: err?.message || String(err),
      });
      return res.status(500).json({
        ok: false,
        code: "INTERNAL_ERROR",
        message: "Não foi possível obter a configuração de mercado.",
      });
    }
  }
);

/**
 * PUT /tenant/:tenantId/market-config
 * Cria/atualiza e carimba updatedAt/updatedBy
 */
adminMarketRouter.put(
  "/tenant/:tenantId/market-config",
  ensureAuth,
  withTenant,
  // opcional: exigir feature específica
  // requireFeature("market.config:write"),
  async (req: Request, res: Response) => {
    try {
      const parsed = marketConfigBodySchema.safeParse(req.body);
      if (!parsed.success) {
        return badRequest(res, "Payload inválido para MarketConfig.", parsed.error.issues);
      }

      const { tenantId } = req.params;
      const uid =
        (req as any)?.uid ||
        (req as any)?.user?.uid ||
        (req as any)?.auth?.uid ||
        "";

      const updated = await upsertMarketConfig(tenantId, parsed.data, { uid });

      (logger ?? console).info?.("admin.market-config.updated", { tenantId, uid });
      return res.status(200).json({ ok: true, data: updated });
    } catch (err: any) {
      (logger ?? console).error?.("admin.market-config.put.error", {
        tenantId: req.params?.tenantId,
        error: err?.message || String(err),
      });

      if (err?.code === "VALIDATION_ERROR") {
        return badRequest(res, err?.message ?? "Erro de validação.", err?.issues);
      }
      return res.status(500).json({
        ok: false,
        code: "INTERNAL_ERROR",
        message: "Não foi possível salvar a configuração de mercado.",
      });
    }
  }
);

export default adminMarketRouter;
