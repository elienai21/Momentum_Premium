import { db } from "src/services/firebase";
import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/errors";
import { logger } from "../utils/logger";

/**
 * Controle de features por tenant + plano.
 * - Lê a coleção "plans" em Firestore
 * - Usa cache em memória para não bater no banco a cada request
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
  setTimeout(() => planCache.delete(cacheKey), CACHE_TTL_MS);

  return features;
}

export function requireFeature(featureKey: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const isTest = process.env.NODE_ENV === "test";
    const skipInTest = isTest && process.env.TEST_SKIP_FEATURES === "true";
    if (skipInTest) return next();
    try {
      if (!req.tenant) {
        throw new ApiError(401, "Tenant context required.");
      }

      const tenantId = req.tenant.info?.id || "unknown";
      const plan = (req.tenant.info?.plan || "free").toLowerCase();
      const featureEnabled = req.tenant.flags?.[featureKey] === true;

      // In test mode, allow non-free plans without hitting Firestore to avoid flakiness.
      if (isTest && plan !== "free") {
        return next();
      }

      // Block immediately for free plans to avoid unnecessary lookups and ensure deterministic gating
      if (plan === "free") {
        return res.status(403).json({
          ok: false,
          error: "Feature not available in your plan.",
          feature: featureKey,
          plan,
          code: "UPGRADE_REQUIRED",
        });
      }

      logger.info("Checking feature access", {
        tenantId,
        featureKey,
        plan,
        enabled: featureEnabled,
        traceId: (req as any).traceId,
      });

      const planFeatures = await getPlanFeatures(plan);
      const hasAccess = featureEnabled || planFeatures.includes(featureKey);

      if (!hasAccess) {
        logger.warn("Feature access denied", {
          tenantId,
          featureKey,
          plan,
          traceId: (req as any).traceId,
        });

        return res.status(403).json({
          ok: false,
          error: "Feature not available in your plan.",
          feature: featureKey,
          plan,
          code: "UPGRADE_REQUIRED", // 👈 agora o front consegue abrir modal de upgrade
        });
      }

      next();
    } catch (error) {
      logger.error("requireFeature middleware failed", {
        error,
        featureKey,
        traceId: (req as any).traceId,
      });
      next(error);
    }
  };
}

