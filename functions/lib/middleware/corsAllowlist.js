"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.corsAllowlist = corsAllowlist;
const tenants_1 = require("../core/tenants"); // você já tem util de tenants
const logger_1 = require("../utils/logger");
// Lista branca base (staging e local). Ajuste conforme seu setup:
const BASE_ALLOWLIST = new Set([
    "http://localhost:5000", // Firebase hosting emulador
    "http://127.0.0.1:5000",
    "http://localhost:5173", // Vite/Dev
    "http://127.0.0.1:5173"
]);
async function corsAllowlist(req, res, next) {
    const origin = (req.headers.origin || "").toString();
    // Permite preflight básico antes de resolver tenant
    if (req.method === "OPTIONS") {
        res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
        res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Trace-Id");
    }
    // Allowlist de base para dev/staging
    if (BASE_ALLOWLIST.has(origin)) {
        res.header("Vary", "Origin");
        res.header("Access-Control-Allow-Origin", origin);
        res.header("Access-Control-Allow-Credentials", "true");
        if (req.method === "OPTIONS")
            return res.sendStatus(204);
        return next();
    }
    // Se vier via subdomínio do cliente (ex: https://acme.momentum.app)
    try {
        const host = (req.headers["x-forwarded-host"] || req.headers.host || "").toString().toLowerCase();
        // Resolve tenant pelo host (sua getTenantByDomain já prevê isso)
        const tenant = await (0, tenants_1.getTenantByDomain)(host);
        if (tenant?.domain && origin.includes(tenant.domain)) {
            res.header("Vary", "Origin");
            res.header("Access-Control-Allow-Origin", origin);
            res.header("Access-Control-Allow-Credentials", "true");
            if (req.method === "OPTIONS")
                return res.sendStatus(204);
            return next();
        }
    }
    catch (err) {
        logger_1.logger.warn("CORS allowlist resolve failed", { error: err.message });
    }
    // Bloqueia por padrão
    if (origin) {
        return res.status(403).json({ ok: false, error: "Origin not allowed" });
    }
    // Sem Origin (ex: curl do back-end) — permite
    return next();
}
