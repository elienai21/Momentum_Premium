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
    console.warn("[AUTH_MISSING]", {
      message: "Missing or invalid Authorization/x-id-token header",
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

    console.log("[AUTH_DECODED]", {
      uid: decoded.uid,
      email: decoded.email || null,
      aud: decoded.aud,
      iss: decoded.iss,
      traceId,
    });

    // (Opcional) leitura de roles de platform_roles, se já existir no projeto
    let isAdmin = false;
    try {
      const roleDoc = await db.collection("platform_roles").doc(decoded.uid).get();
      const roleData = roleDoc.exists ? roleDoc.data() : null;
      isAdmin = roleData?.role === "admin";
    } catch (roleErr) {
      console.warn("[AUTH_ROLE_LOOKUP_FAIL]", {
        message: String(roleErr),
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

    console.log("[AUTH_OK]", {
      uid: req.user.uid,
      email: req.user.email,
      tenantId: req.user.tenantId || null,
      isAdmin: req.user.isAdmin,
      traceId,
    });

    next();
  } catch (err: any) {
    console.error("[AUTH_EXCEPTION]", {
      message: err?.message,
      code: err?.code,
      stack: err?.stack,
      traceId,
    });
    logger.error("Auth failed validation", {
      error: err?.message,
      code: err?.code,
      traceId,
    });
    return next(new ApiError(401, "Unauthorized: Invalid or expired token."));
  }
};
