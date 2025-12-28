// functions/src/middleware/rateLimit.ts
// Lazy-init do Admin SDK + chave distribuída HMAC(IP):epochMinute + TTL em expiresAt.

import * as admin from "firebase-admin";
import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";

export type RateLimitOptions = {
  maxPerWindow?: number;
  windowSeconds?: number;
  graceWindows?: number;
  allowlistCidrs?: string[];
  allowlistIps?: string[];
  headerName?: string;
  collection?: string;
  secret?: string;
  enabled?: boolean;
};

// ⬇️ Lazy init
function getDb(): FirebaseFirestore.Firestore {
  if (!admin.apps.length) admin.initializeApp();
  return admin.firestore();
}

function ipFromRequest(req: Request): string {
  const xf = (req.headers["x-forwarded-for"] as string) || "";
  const xfIp = xf.split(",")[0].trim();
  const ip = xfIp || (req.ip || "").replace("::ffff:", "") || "0.0.0.0";
  return ip;
}

function hmacHex(secret: string, value: string, len = 40) {
  return crypto.createHmac("sha256", secret).update(value).digest("hex").slice(0, len);
}

function inAllowlist(ip: string, ips?: string[], cidrs?: string[]) {
  if (ips && ips.includes(ip)) return true;
  if (!cidrs || cidrs.length === 0) return false;
  for (const block of cidrs) {
    const [base, mask] = block.split("/");
    if (!base || !mask) continue;
    if (mask === "32" && ip === base) return true;
    if (mask === "24") {
      const a = base.split(".").slice(0, 3).join(".");
      const b = ip.split(".").slice(0, 3).join(".");
      if (a === b) return true;
    }
  }
  return false;
}

// In-memory fallback cache (per-instance, simple TTL-based)
// Used when Firestore is unavailable
const memoryCache = new Map<string, { count: number; expiresAt: number }>();

function getFromMemoryCache(key: string, now: number): number {
  const entry = memoryCache.get(key);
  if (!entry || entry.expiresAt < now) {
    memoryCache.delete(key);
    return 0;
  }
  return entry.count;
}

function setInMemoryCache(key: string, count: number, expiresAt: number): void {
  memoryCache.set(key, { count, expiresAt });
  // Simple cleanup to avoid unbounded growth
  if (memoryCache.size > 10000) {
    const now = Date.now();
    for (const [k, v] of memoryCache.entries()) {
      if (v.expiresAt < now) memoryCache.delete(k);
    }
  }
}

export function createRateLimit(opts: RateLimitOptions = {}) {
  const {
    maxPerWindow = parseInt(process.env.RATE_LIMIT_MAX || "120", 10),
    windowSeconds = parseInt(process.env.RATE_LIMIT_WINDOW || "60", 10),
    graceWindows = parseInt(process.env.RATE_LIMIT_GRACE_WINDOWS || "2", 10),
    allowlistCidrs = (process.env.RATE_LIMIT_ALLOWLIST_CIDRS || "").split(",").map(s => s.trim()).filter(Boolean),
    allowlistIps = (process.env.RATE_LIMIT_ALLOWLIST_IPS || "").split(",").map(s => s.trim()).filter(Boolean),
    headerName = opts.headerName || "X-RateLimit-Remaining",
    collection = opts.collection || "rate_limits",
    secret = (opts.secret || process.env.RATE_LIMIT_SECRET || "dev-secret").trim(),
    enabled = (typeof opts.enabled === "boolean") ? opts.enabled : true,
  } = opts;

  // SECURITY: Critical routes that should fail-closed on rate limit errors
  // Updated to match actual application routes (billing, admin, imports, vision)
  const criticalRoutes = [
    "/api/billing",
    "/api/admin",
    "/api/imports",
    "/api/vision",
    "/api/ai/vision",
  ];

  return async function rateLimit(req: Request, res: Response, next: NextFunction) {
    if (!enabled) return next();

    try {
      const ip = ipFromRequest(req);
      if (inAllowlist(ip, allowlistIps, allowlistCidrs)) return next();

      const db = getDb();
      const now = Date.now();
      const minute = Math.floor(now / (windowSeconds * 1000));
      const ipHash = hmacHex(secret, ip, 40);
      const key = `${ipHash}:${minute}`;
      const ref = db.collection(collection).doc(key);

      let count = 0;
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        count = (snap.exists ? (snap.get("count") || 0) : 0) + 1;
        tx.set(ref, {
          count,
          ipHash,
          window: minute,
          expiresAt: admin.firestore.Timestamp.fromMillis((minute + graceWindows) * windowSeconds * 1000),
          path: req.path,
          ts: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      });

      const remaining = Math.max(0, maxPerWindow - count);
      res.setHeader(headerName, remaining.toString());

      if (count > maxPerWindow) {
        console.warn(JSON.stringify({ level: "warn", type: "rate_limit", ipHash, path: req.path, remaining, limit: maxPerWindow }));
        return res.status(429).json({ error: "Too Many Requests" });
      }

      return next();
    } catch (e) {
      console.error(JSON.stringify({ level: "error", type: "rate_limit_error", err: String(e) }));

      // FALLBACK STRATEGY:
      // Check if this is a critical route that should fail-closed
      const isCritical = criticalRoutes.some(route => req.path.startsWith(route));

      if (isCritical) {
        // FAIL-CLOSED: Deny request on critical routes when Firestore fails
        console.warn(JSON.stringify({
          level: "warn",
          type: "rate_limit_fail_closed",
          path: req.path,
          reason: "Firestore unavailable for critical route",
        }));
        return res.status(503).json({
          error: "Service temporarily unavailable",
          code: "RATE_LIMIT_UNAVAILABLE",
        });
      }

      // For non-critical routes, use in-memory fallback
      try {
        const ip = ipFromRequest(req);
        const now = Date.now();
        const minute = Math.floor(now / (windowSeconds * 1000));
        const ipHash = hmacHex(secret, ip, 40);
        const key = `${ipHash}:${minute}`;

        const count = getFromMemoryCache(key, now) + 1;
        const expiresAt = (minute + graceWindows) * windowSeconds * 1000;
        setInMemoryCache(key, count, expiresAt);

        const remaining = Math.max(0, maxPerWindow - count);
        res.setHeader(headerName, remaining.toString());

        if (count > maxPerWindow) {
          console.warn(JSON.stringify({
            level: "warn",
            type: "rate_limit_memory_fallback",
            path: req.path,
            remaining,
          }));
          return res.status(429).json({ error: "Too Many Requests" });
        }

        console.info(JSON.stringify({
          level: "info",
          type: "rate_limit_memory_fallback_ok",
          path: req.path,
        }));
        return next();
      } catch (memErr) {
        // If memory fallback also fails, fail-open for non-critical routes
        console.error(JSON.stringify({
          level: "error",
          type: "rate_limit_total_failure",
          err: String(memErr),
        }));
        return next(); // fail-open as last resort for non-critical routes
      }
    }
  };
}

export default createRateLimit;
