"use strict";
// functions/src/middleware/rateLimit.ts
// Lazy-init do Admin SDK + chave distribuída HMAC(IP):epochMinute + TTL em expiresAt.
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRateLimit = createRateLimit;
const admin = __importStar(require("firebase-admin"));
const crypto_1 = __importDefault(require("crypto"));
// ⬇️ Lazy init
function getDb() {
    if (!admin.apps.length)
        admin.initializeApp();
    return admin.firestore();
}
function ipFromRequest(req) {
    const xf = req.headers["x-forwarded-for"] || "";
    const xfIp = xf.split(",")[0].trim();
    const ip = xfIp || (req.ip || "").replace("::ffff:", "") || "0.0.0.0";
    return ip;
}
function hmacHex(secret, value, len = 40) {
    return crypto_1.default.createHmac("sha256", secret).update(value).digest("hex").slice(0, len);
}
function inAllowlist(ip, ips, cidrs) {
    if (ips && ips.includes(ip))
        return true;
    if (!cidrs || cidrs.length === 0)
        return false;
    for (const block of cidrs) {
        const [base, mask] = block.split("/");
        if (!base || !mask)
            continue;
        if (mask === "32" && ip === base)
            return true;
        if (mask === "24") {
            const a = base.split(".").slice(0, 3).join(".");
            const b = ip.split(".").slice(0, 3).join(".");
            if (a === b)
                return true;
        }
    }
    return false;
}
function createRateLimit(opts = {}) {
    const { maxPerWindow = parseInt(process.env.RATE_LIMIT_MAX || "120", 10), windowSeconds = parseInt(process.env.RATE_LIMIT_WINDOW || "60", 10), graceWindows = parseInt(process.env.RATE_LIMIT_GRACE_WINDOWS || "2", 10), allowlistCidrs = (process.env.RATE_LIMIT_ALLOWLIST_CIDRS || "").split(",").map(s => s.trim()).filter(Boolean), allowlistIps = (process.env.RATE_LIMIT_ALLOWLIST_IPS || "").split(",").map(s => s.trim()).filter(Boolean), headerName = opts.headerName || "X-RateLimit-Remaining", collection = opts.collection || "rate_limits", secret = (opts.secret || process.env.RATE_LIMIT_SECRET || "dev-secret").trim(), enabled = (typeof opts.enabled === "boolean") ? opts.enabled : true, } = opts;
    return async function rateLimit(req, res, next) {
        if (!enabled)
            return next();
        try {
            const ip = ipFromRequest(req);
            if (inAllowlist(ip, allowlistIps, allowlistCidrs))
                return next();
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
        }
        catch (e) {
            console.error(JSON.stringify({ level: "error", type: "rate_limit_error", err: String(e) }));
            return next(); // fail-open em erro infra
        }
    };
}
exports.default = createRateLimit;
