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
    // Em modo de teste, o createExpressApp injeta `req.user` mockado.
    // Não exigir token nesses cenários evita que os testes dependam de Firebase Auth real.
    if (process.env.NODE_ENV === "test" && req.user?.uid) {
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
        console.warn("[AUTH_MISSING]", {
            message: "Missing or invalid Authorization/x-id-token header",
            traceId: req.traceId || null,
        });
        return next(new errors_1.ApiError(401, "Unauthorized: Missing or invalid Authorization/x-id-token header."));
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
            const roleDoc = await firebase_1.db.collection("platform_roles").doc(decoded.uid).get();
            const roleData = roleDoc.exists ? roleDoc.data() : null;
            isAdmin = roleData?.role === "admin";
        }
        catch (roleErr) {
            console.warn("[AUTH_ROLE_LOOKUP_FAIL]", {
                message: String(roleErr),
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
        console.log("[AUTH_OK]", {
            uid: req.user.uid,
            email: req.user.email,
            tenantId: req.user.tenantId || null,
            isAdmin: req.user.isAdmin,
            traceId,
        });
        next();
    }
    catch (err) {
        console.error("[AUTH_EXCEPTION]", {
            message: err?.message,
            code: err?.code,
            stack: err?.stack,
            traceId,
        });
        logger_1.logger.error("Auth failed validation", {
            error: err?.message,
            code: err?.code,
            traceId,
        });
        return next(new errors_1.ApiError(401, "Unauthorized: Invalid or expired token."));
    }
};
exports.requireAuth = requireAuth;
