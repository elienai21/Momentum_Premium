// functions/src/routes/market.ts
import { Router, Request, Response, NextFunction } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { withTenant } from "../middleware/withTenant";
import { chargeCredits } from "../billing/chargeCredits";
import { getMarketAdvice } from "../market/marketAdvisorService";
import { getMarketConfig } from "../services/marketConfigService";
import { logger } from "../utils/logger";
import type { Horizon } from "../services/marketConfigService";
import type { PlanTier } from "../billing/creditsTypes";

export const marketRouter = Router();

/**
 * POST /api/market/advice
 * Body: { question?: string; locale?: string }
 * Requer: requireAuth + withTenant
 */
marketRouter.post(
  "/advice",
  requireAuth,
  withTenant,
  async (req: Request, res: Response, _next: NextFunction) => {
    const startedAt = Date.now();

    try {
      const tenantId = req.tenant?.info.id;
      if (!tenantId) {
        return res.status(400).json({
          ok: false,
          code: "BAD_REQUEST",
          message: "Tenant não informado.",
        });
      }

      // 0) Plano do tenant
      const plan: PlanTier = (req.tenant?.info?.plan || "starter") as PlanTier;

      // 1) Guard de configuração do conselheiro de mercado
      const cfg = await getMarketConfig(tenantId);
      if (!cfg.enabled) {
        logger.info("market.advice.disabled", { tenantId });
        return res.status(403).json({
          ok: false,
          code: "MARKET_DISABLED",
          message: "Conselheiro de mercado desativado para este tenant.",
        });
      }

      const { question, locale } = (req.body ?? {}) as {
        question?: string;
        locale?: string;
      };

      // 3) Chamada ao serviço com cobrança de créditos transacional e idempotente
      const input = {
        tenantId,
        question,
        locale,
        context: {
          sector: cfg.sector,
          region: cfg.region,
          companySize: cfg.companySize,
          horizon: (cfg.horizon ?? "90d") as Horizon,
        },
      };

      const ctx = { tenantId, plan };

      const result = await chargeCredits(
        {
          tenantId,
          plan,
          featureKey: "market.advice",
          traceId: (req as any).traceId,
          idempotencyKey: req.header("x-idempotency-key"),
        },
        async () => {
          return await getMarketAdvice(input, ctx);
        }
      );

      logger.info("market.advice.success", {
        tenantId,
        latencyMs: Date.now() - startedAt,
      });

      return res.status(200).json({
        ok: true,
        data: result,
      });
    } catch (err: any) {
      const status: number | undefined =
        err?.status || err?.response?.status || undefined;
      const payload = err?.payload || err?.response?.data || {};
      const apiCode: string | undefined = payload?.code || err?.code;

      // 402 — sem créditos
      if (status === 402 || apiCode === "NO_CREDITS") {
        return res.status(402).json({
          ok: false,
          code: "NO_CREDITS",
          message:
            payload?.message ||
            "Você não possui créditos de IA suficientes para usar este recurso.",
        });
      }

      // 502 — provedor de IA indisponível
      if (status === 502 || apiCode === "AI_PROVIDER_ERROR") {
        logger.error("market.advice.ai_provider_error", {
          error: err?.message || String(err),
        });
        return res.status(502).json({
          ok: false,
          code: "AI_PROVIDER_ERROR",
          message: "Serviço de IA indisponível no momento. Tente novamente.",
        });
      }

      logger.error("market.advice.unhandled_error", {
        error: err?.message || String(err),
      });
      return res.status(500).json({
        ok: false,
        code: "INTERNAL_ERROR",
        message: "Não foi possível obter a análise de mercado.",
      });
    }
  }
);

export default marketRouter;
