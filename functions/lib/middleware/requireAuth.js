"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = void 0;
const firebase_1 = require("../services/firebase");
const admin = __importStar(require("firebase-admin"));
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
const trace_1 = require("../utils/trace");
require("../types");
const requireAuth = async (req, res, next) => {
    (0, trace_1.ensureTraceId)(req);
    const traceId = req.traceId || null;
    // SECURITY: Only bypass auth in emulator or explicit test mode
    // Never rely on NODE_ENV alone - can be accidentally set in production
    const allowBypass = process.env.FUNCTIONS_EMULATOR === "true" ||
        process.env.ALLOW_AUTH_BYPASS_FOR_TESTS === "true";
    if (allowBypass && req.user?.uid) {
        return next();
    }
    const { authorization, "x-id-token": xIdToken, "x-goog-access-token": googleAccessToken, } = req.headers;
    let idToken = null;
    // IMPORTANTE (Cloud Run IAM + Firebase Hosting):
    // - Requests vindas do browser via Hosting DEVEM usar x-id-token.
    // - Authorization pode conter token OIDC do invocador (Hosting/SA) e não deve ser priorizado.
    if (typeof xIdToken === "string" && xIdToken.trim().length > 0) {
        idToken = xIdToken.trim();
    }
    else if (authorization && authorization.startsWith("Bearer ")) {
        idToken = authorization.slice("Bearer ".length).trim();
    }
    if (!idToken) {
        logger_1.logger.warn("Auth header missing", {
            traceId: req.traceId || null,
        });
        return next(new errors_1.ApiError(401, "Unauthorized: Missing or invalid Authorization/x-id-token header."));
    }
    try {
        // ? Deixe o Firebase Admin validar o token (inclui aud/iss internamente)
        const decoded = await admin.auth().verifyIdToken(idToken, true);
        // SECURITY: Never log token contents, email, aud, or iss
        // Only log uid and traceId for debugging
        logger_1.logger.info("Auth token validated", {
            uid: decoded.uid,
            hasTenantId: !!decoded.tenantId || !!decoded.tenant_id,
            traceId,
        });
        // (Opcional) leitura de roles de platform_roles, se já existir no projeto
        let isAdmin = false;
        try {
            const roleDoc = await firebase_1.db.collection("platform_roles").doc(decoded.uid).get();
            const roleData = roleDoc.exists ? roleDoc.data() : null;
            isAdmin = roleData?.role === "admin";
        }
        catch (roleErr) {
            logger_1.logger.warn("Auth role lookup failed", {
                uid: decoded.uid,
                traceId,
            });
        }
        req.user = {
            uid: decoded.uid,
            email: decoded.email || "unknown",
            tenantId: decoded.tenantId || decoded.tenant_id,
            isAdmin,
        };
        if (typeof googleAccessToken === "string") {
            req.googleAccessToken = googleAccessToken;
        }
        // SECURITY: Never log email - only uid and safe metadata
        logger_1.logger.info("Auth completed", {
            uid: req.user.uid,
            isAdmin: req.user.isAdmin,
            hasTenantId: !!req.user.tenantId,
            traceId,
        });
        next();
    }
    catch (err) {
        // SECURITY: Never log stack traces - only error code and message
        logger_1.logger.error("Auth failed validation", {
            code: err?.code,
            errorType: err?.name,
            traceId,
        });
        return next(new errors_1.ApiError(401, "Unauthorized: Invalid or expired token."));
    }
};
exports.requireAuth = requireAuth;
