// functions/src/middleware/withTenant.ts
// Lazy-init do Admin SDK para nÇœo quebrar o analyzer do Firebase CLI.

import * as admin from "firebase-admin";
import type { Request, Response, NextFunction } from "express";

type TenantInfo = {
  id: string;
  name?: string;
  plan?: string;
  locale?: string;
  features?: Record<string, any>;
  ownerUid?: string;
  createdAt?: FirebaseFirestore.Timestamp | string;
};

type FeatureFlags = Record<string, any>;
type CacheEntry<T> = { value: T; until: number };

const CACHE_TTL_MS = parseInt(process.env.TENANT_CACHE_TTL_MS || "10000", 10); // 10s (reduced from 60s)
const tenantInfoCache = new Map<string, CacheEntry<TenantInfo>>();
const tenantFlagsCache = new Map<string, CacheEntry<FeatureFlags>>();

function now() {
  return Date.now();
}

function getCached<T>(m: Map<string, CacheEntry<T>>, k: string): T | undefined {
  const c = m.get(k);
  if (!c) return undefined;
  if (c.until < now()) {
    m.delete(k);
    return undefined;
  }
  return c.value;
}

function setCached<T>(m: Map<string, CacheEntry<T>>, k: string, v: T) {
  m.set(k, { value: v, until: now() + CACHE_TTL_MS });
}

function getDb(): FirebaseFirestore.Firestore {
  if (!admin.apps.length) admin.initializeApp();
  return admin.firestore();
}

function logError(type: string, e: any, extras?: Record<string, any>) {
  const payload = { level: "error", type, err: String(e), ...(extras || {}) };
  console.error(JSON.stringify(payload));
}

async function loadTenantInfo(tenantId: string): Promise<TenantInfo> {
  const cached = getCached(tenantInfoCache, tenantId);
  if (cached) return cached;

  const db = getDb();
  const snap = await db.doc(`tenants/${tenantId}`).get();
  if (!snap.exists) {
    throw new Error(`Tenant ${tenantId} not found`);
  }
  const data = snap.data() || {};
  const info: TenantInfo = {
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

async function loadTenantFlags(tenantId: string): Promise<FeatureFlags> {
  const cached = getCached(tenantFlagsCache, tenantId);
  if (cached) return cached;

  const db = getDb();
  const snap = await db.doc(`tenants/${tenantId}/settings/flags`).get();
  const flags = (snap.exists ? (snap.data() as FeatureFlags) : {}) || {};
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
export function invalidateTenantCache(tenantId: string): void {
  tenantInfoCache.delete(tenantId);
  tenantFlagsCache.delete(tenantId);
}

export async function withTenant(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantDebug =
      process.env.TENANT_DEBUG === "true" || process.env.REQUEST_DEBUG === "true";
    const claimTenant = (req.user as any)?.tenantId as string | undefined;
    const headerTenant =
      (req.header("x-tenant-id") || (req.query.tenantId as string) || "").trim() || undefined;

    if (tenantDebug) {
      console.log("[TENANT_RESOLVE_START]", {
        fromHeader: req.headers["x-tenant-id"] || null,
        fromQuery: (req.query as any).tenantId || null,
        fromUser: req.user?.tenantId || null,
        uid: req.user?.uid || null,
        traceId: (req as any).traceId || null,
      });
    }

    const tenantId = claimTenant || headerTenant;

    if (tenantDebug) {
      console.log("[TENANT_RESOLVE_SELECTED]", {
        tenantId: tenantId || null,
        uid: req.user?.uid || null,
        traceId: (req as any).traceId || null,
      });
    }

    if (!tenantId) return res.status(400).json({ error: "Missing tenant id" });
    if (!req.user?.uid) return res.status(401).json({ error: "Auth required" });

    const db = getDb();
    const tenantDoc = await db.doc(`tenants/${tenantId}`).get();
    if (!tenantDoc.exists) {
      console.error("[TENANT_NOT_FOUND]", {
        tenantId,
        uid: req.user?.uid || null,
        traceId: (req as any).traceId || null,
      });
      return res.status(404).json({ error: "Tenant not found" });
    }

    const memberSnap = await db.doc(`tenants/${tenantId}/members/${req.user.uid}`).get();
    const memberData = memberSnap.exists ? (memberSnap.data() as any) : null;
    const memberStatus = memberData?.status as string | undefined;
    if (tenantDebug) {
      console.log("[TENANT_MEMBER_LOOKUP]", {
        tenantId,
        memberDocPath: `tenants/${tenantId}/members/${req.user?.uid}`,
        exists: memberSnap.exists,
        hasStatus: typeof memberStatus === "string",
        status: memberStatus || null,
        traceId: (req as any).traceId || null,
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
        traceId: (req as any).traceId || null,
      });
      return res.status(403).json({ error: "Not a tenant member" });
    }

    if (!memberStatus) {
      console.warn("[TENANT_MEMBER_MISSING_STATUS]", {
        tenantId,
        uid: req.user?.uid || null,
        traceId: (req as any).traceId || null,
      });
    }

    const role = (memberSnap.get("role") || "member") as string;

    const [info, flags] = await Promise.all([
      loadTenantInfo(tenantId),
      loadTenantFlags(tenantId),
    ]);

    req.tenant = { id: info.id, role, info, flags } as any;

    if (tenantDebug) {
      console.log("[TENANT_OK]", {
        tenantId: req.tenant.info.id,
        uid: req.user?.uid || null,
        traceId: (req as any).traceId || null,
      });
    }

    return next();
  } catch (e) {
    logError("withTenant_failure", e, { path: req.path, uid: req.user?.uid, traceId: (req as any).traceId || null });
    return res.status(500).json({ error: "Tenant resolution error" });
  }
}

export default withTenant;
