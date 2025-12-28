"use strict";
// functions/src/middleware/withTenant.ts
// Lazy-init do Admin SDK para nÇœo quebrar o analyzer do Firebase CLI.
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
exports.invalidateTenantCache = invalidateTenantCache;
exports.withTenant = withTenant;
const admin = __importStar(require("firebase-admin"));
const CACHE_TTL_MS = parseInt(process.env.TENANT_CACHE_TTL_MS || "10000", 10); // 10s (reduced from 60s)
const tenantInfoCache = new Map();
const tenantFlagsCache = new Map();
function now() {
    return Date.now();
}
function getCached(m, k) {
    const c = m.get(k);
    if (!c)
        return undefined;
    if (c.until < now()) {
        m.delete(k);
        return undefined;
    }
    return c.value;
}
function setCached(m, k, v) {
    m.set(k, { value: v, until: now() + CACHE_TTL_MS });
}
function getDb() {
    if (!admin.apps.length)
        admin.initializeApp();
    return admin.firestore();
}
function logError(type, e, extras) {
    const payload = { level: "error", type, err: String(e), ...(extras || {}) };
    console.error(JSON.stringify(payload));
}
async function loadTenantInfo(tenantId) {
    const cached = getCached(tenantInfoCache, tenantId);
    if (cached)
        return cached;
    const db = getDb();
    const snap = await db.doc(`tenants/${tenantId}`).get();
    if (!snap.exists) {
        throw new Error(`Tenant ${tenantId} not found`);
    }
    const data = snap.data() || {};
    const info = {
        id: snap.id,
        name: data.name,
        plan: data.plan ?? data.planId ?? "free",
        locale: data.locale || "pt-BR",
        features: data.features || {},
        ownerUid: data.ownerUid,
        createdAt: data.createdAt,
    };
    setCached(tenantInfoCache, tenantId, info);
    return info;
}
async function loadTenantFlags(tenantId) {
    const cached = getCached(tenantFlagsCache, tenantId);
    if (cached)
        return cached;
    const db = getDb();
    const snap = await db.doc(`tenants/${tenantId}/settings/flags`).get();
    const flags = (snap.exists ? snap.data() : {}) || {};
    setCached(tenantFlagsCache, tenantId, flags);
    return flags;
}
/**
 * Invalidate tenant cache manually
 * Call this after updating tenant plan, memberships, or features
 *
 * TODO: Future improvement - trigger this automatically via:
 * - Firestore triggers (onUpdate to tenants/{tenantId})
 * - PubSub messages for distributed cache invalidation
 */
function invalidateTenantCache(tenantId) {
    tenantInfoCache.delete(tenantId);
    tenantFlagsCache.delete(tenantId);
}
async function withTenant(req, res, next) {
    try {
        const tenantDebug = process.env.TENANT_DEBUG === "true" || process.env.REQUEST_DEBUG === "true";
        const claimTenant = req.user?.tenantId;
        const headerTenant = (req.header("x-tenant-id") || req.query.tenantId || "").trim() || undefined;
        if (tenantDebug) {
            // SECURITY: Don't log full headers/query, only tenant ID sources
            console.log("[TENANT_RESOLVE_START]", {
                hasHeader: !!req.headers["x-tenant-id"],
                hasQuery: !!req.query.tenantId,
                fromUser: req.user?.tenantId || null,
                uid: req.user?.uid || null,
                traceId: req.traceId || null,
            });
        }
        const tenantId = claimTenant || headerTenant;
        if (tenantDebug) {
            console.log("[TENANT_RESOLVE_SELECTED]", {
                tenantId: tenantId || null,
                uid: req.user?.uid || null,
                traceId: req.traceId || null,
            });
        }
        if (!tenantId)
            return res.status(400).json({ error: "Missing tenant id" });
        if (!req.user?.uid)
            return res.status(401).json({ error: "Auth required" });
        const db = getDb();
        const tenantDoc = await db.doc(`tenants/${tenantId}`).get();
        if (!tenantDoc.exists) {
            console.error("[TENANT_NOT_FOUND]", {
                tenantId,
                uid: req.user?.uid || null,
                traceId: req.traceId || null,
            });
            return res.status(404).json({ error: "Tenant not found" });
        }
        const memberSnap = await db.doc(`tenants/${tenantId}/members/${req.user.uid}`).get();
        const memberData = memberSnap.exists ? memberSnap.data() : null;
        const memberStatus = memberData?.status;
        if (tenantDebug) {
            console.log("[TENANT_MEMBER_LOOKUP]", {
                tenantId,
                memberDocPath: `tenants/${tenantId}/members/${req.user?.uid}`,
                exists: memberSnap.exists,
                hasStatus: typeof memberStatus === "string",
                status: memberStatus || null,
                traceId: req.traceId || null,
            });
        }
        // Legado: alguns tenants antigos nǜo tinham `status`. Aceita como active se ausente,
        // mas bloqueia explicitamente quando houver status e nǜo for "active".
        if (!memberSnap.exists || (memberStatus && memberStatus !== "active")) {
            console.error("[TENANT_MEMBER_INVALID]", {
                tenantId,
                uid: req.user?.uid || null,
                exists: memberSnap.exists,
                status: memberStatus || null,
                traceId: req.traceId || null,
            });
            return res.status(403).json({ error: "Not a tenant member" });
        }
        if (!memberStatus) {
            console.warn("[TENANT_MEMBER_MISSING_STATUS]", {
                tenantId,
                uid: req.user?.uid || null,
                traceId: req.traceId || null,
            });
        }
        const role = (memberSnap.get("role") || "member");
        const [info, flags] = await Promise.all([
            loadTenantInfo(tenantId),
            loadTenantFlags(tenantId),
        ]);
        req.tenant = { id: info.id, role, info, flags };
        if (tenantDebug) {
            console.log("[TENANT_OK]", {
                tenantId: req.tenant.info.id,
                uid: req.user?.uid || null,
                traceId: req.traceId || null,
            });
        }
        return next();
    }
    catch (e) {
        logError("withTenant_failure", e, { path: req.path, uid: req.user?.uid, traceId: req.traceId || null });
        return res.status(500).json({ error: "Tenant resolution error" });
    }
}
exports.default = withTenant;
