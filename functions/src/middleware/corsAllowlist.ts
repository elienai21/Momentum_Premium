import { db } from "src/services/firebase";
// src/middleware/corsAllowlist.ts
import { Request, Response, NextFunction } from "express";
import { getTenantByDomain } from "../core/tenants"; // você já tem util de tenants
import { logger } from "../utils/logger";

// Lista branca base (staging e local). Ajuste conforme seu setup:
const BASE_ALLOWLIST = new Set<string>([
  "http://localhost:5000",     // Firebase hosting emulador
  "http://127.0.0.1:5000",
  "http://localhost:5173",     // Vite/Dev
  "http://127.0.0.1:5173"
]);

export async function corsAllowlist(req: Request, res: Response, next: NextFunction) {
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
    if (req.method === "OPTIONS") return res.sendStatus(204);
    return next();
  }

  // Se vier via subdomínio do cliente (ex: https://acme.momentum.app)
  try {
    const host = (req.headers["x-forwarded-host"] || req.headers.host || "").toString().toLowerCase();
    // Resolve tenant pelo host (sua getTenantByDomain já prevê isso)
    const tenant = await getTenantByDomain(host);
    if (tenant?.domain && origin.includes(tenant.domain)) {
      res.header("Vary", "Origin");
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Access-Control-Allow-Credentials", "true");
      if (req.method === "OPTIONS") return res.sendStatus(204);
      return next();
    }
  } catch (err) {
    logger.warn("CORS allowlist resolve failed", { error: (err as Error).message });
  }

  // Bloqueia por padrão
  if (origin) {
    return res.status(403).json({ ok: false, error: "Origin not allowed" });
  }

  // Sem Origin (ex: curl do back-end) — permite
  return next();
}



