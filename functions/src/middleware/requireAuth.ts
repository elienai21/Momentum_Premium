import { db } from "src/services/firebase";
import { Request, Response, NextFunction } from "express";
import * as admin from "firebase-admin";
import { ApiError } from "../utils/errors";
import { logger } from "../utils/logger";
import { ensureTraceId } from "../utils/trace";
import "../types";

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  ensureTraceId(req);
  const traceId = (req as any).traceId || null;

  // SECURITY: Only bypass auth in emulator or explicit test mode
  // Never rely on NODE_ENV alone - can be accidentally set in production
  const allowBypass =
    process.env.FUNCTIONS_EMULATOR === "true" ||
    process.env.ALLOW_AUTH_BYPASS_FOR_TESTS === "true";

  if (allowBypass && (req as any).user?.uid) {
    return next();
  }

  const {
    authorization,
    "x-id-token": xIdToken,
    "x-goog-access-token": googleAccessToken,
  } = req.headers as {
    authorization?: string;
    "x-id-token"?: string;
    "x-goog-access-token"?: string;
  };

  let idToken: string | null = null;

  // IMPORTANTE (Cloud Run IAM + Firebase Hosting):
  // - Requests vindas do browser via Hosting DEVEM usar x-id-token.
  // - Authorization pode conter token OIDC do invocador (Hosting/SA) e não deve ser priorizado.
  if (typeof xIdToken === "string" && xIdToken.trim().length > 0) {
    idToken = xIdToken.trim();
  } else if (authorization && authorization.startsWith("Bearer ")) {
    idToken = authorization.slice("Bearer ".length).trim();
  }

  if (!idToken) {
    logger.warn("Auth header missing", {
      traceId: (req as any).traceId || null,
    });
    return next(
      new ApiError(
        401,
        "Unauthorized: Missing or invalid Authorization/x-id-token header."
      )
    );
  }

  try {
    // ? Deixe o Firebase Admin validar o token (inclui aud/iss internamente)
    const decoded = await admin.auth().verifyIdToken(idToken, true);

    // SECURITY: Never log token contents, email, aud, or iss
    // Only log uid and traceId for debugging
    logger.info("Auth token validated", {
      uid: decoded.uid,
      hasTenantId: !!(decoded as any).tenantId || !!(decoded as any).tenant_id,
      traceId,
    });

    // (Opcional) leitura de roles de platform_roles, se já existir no projeto
    let isAdmin = false;
    try {
      const roleDoc = await db.collection("platform_roles").doc(decoded.uid).get();
      const roleData = roleDoc.exists ? roleDoc.data() : null;
      isAdmin = roleData?.role === "admin";
    } catch (roleErr) {
      logger.warn("Auth role lookup failed", {
        uid: decoded.uid,
        traceId,
      });
    }

    req.user = {
      uid: decoded.uid,
      email: decoded.email || "unknown",
      tenantId: (decoded as any).tenantId || (decoded as any).tenant_id,
      isAdmin,
    } as any;

    if (typeof googleAccessToken === "string") {
      req.googleAccessToken = googleAccessToken;
    }

    // SECURITY: Never log email - only uid and safe metadata
    logger.info("Auth completed", {
      uid: req.user.uid,
      isAdmin: req.user.isAdmin,
      hasTenantId: !!req.user.tenantId,
      traceId,
    });

    next();
  } catch (err: any) {
    // SECURITY: Never log stack traces - only error code and message
    logger.error("Auth failed validation", {
      code: err?.code,
      errorType: err?.name,
      traceId,
    });

    return next(new ApiError(401, "Unauthorized: Invalid or expired token."));
  }
};
