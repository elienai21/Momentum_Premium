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
      return next(); // fail-open em erro infra
    }
  };
}

export default createRateLimit;
