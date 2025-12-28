// functions/src/middleware/requireFeature.ts
import { db } from "../services/firebase";
import { Request, Response, NextFunction } from "express";

import { ApiError } from "../utils/errors";
import { logger } from "../utils/logger";

/**
 * Controle de features por tenant + plano.
 * 🔹 Leitura dinâmica da coleção "plans"
 * 🔹 Cache básico em memória para performance
 * 🔹 Log estruturado com traceId
 */
const planCache = new Map<string, string[]>();
const CACHE_TTL_MS = 60_000; // 1 minuto

async function getPlanFeatures(plan: string): Promise<string[]> {
  const cacheKey = `plan:${plan}`;
  const cached = planCache.get(cacheKey);
  if (cached) return cached;

  const snap = await db.collection("plans").doc(plan.toLowerCase()).get();
  if (!snap.exists) {
    logger.warn("Plan not found in Firestore", { plan });
    return [];
  }

  const data = snap.data() || {};
  const features = Array.isArray(data.features) ? data.features : [];
  planCache.set(cacheKey, features);

  // Expira o cache depois de 1 min
  setTimeout(() => planCache.delete(cacheKey), CACHE_TTL_MS);
  return features;
}

/**
 * Middleware de gating de feature por plano.
 * Se o tenant não tiver acesso, responde 403 com code=UPGRADE_REQUIRED.
 */
export function requireFeature(featureKey: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.tenant) {
        throw new ApiError(401, "Tenant context required.");
      }

      const tenantId = req.tenant.info?.id || "unknown";
      const plan = (req.tenant.info?.plan || "free").toLowerCase();
      const explicitFlag = req.tenant.flags?.[featureKey] === true;

      logger.info("Checking feature access", {
        tenantId,
        featureKey,
        plan,
        explicitFlag,
        traceId: (req as any).traceId,
      });

      // Features declaradas via plano
      const planFeatures = await getPlanFeatures(plan);
      const hasAccess = explicitFlag || planFeatures.includes(featureKey);

      if (!hasAccess) {
        logger.warn("Feature access denied", {
          tenantId,
          featureKey,
          plan,
          traceId: (req as any).traceId,
        });

        return res.status(403).json({
          ok: false,
          code: "UPGRADE_REQUIRED",
          feature: featureKey,
          plan,
          message:
            "Funcionalidade exclusiva de um plano superior. Fale com o suporte para fazer o upgrade.",
        });
      }

      return next();
    } catch (error: any) {
      logger.error("requireFeature middleware failed", {
        error: error?.message,
        featureKey,
        traceId: (req as any).traceId,
      });
      next(error);
    }
  };
}
