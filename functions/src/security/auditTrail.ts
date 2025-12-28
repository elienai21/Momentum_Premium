import { db } from "src/services/firebase";
// ============================
// 🧾 auditTrail.ts — Request Context and Trace (v7.9-FIX)
// ============================

import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

/**
 * Middleware para criar um contexto de auditoria por requisição.
 * Fornece traceId, tenantId, região e idioma para todos os logs.
 */
export function attachTraceContext(req: Request, _res: Response, next: NextFunction) {
  const traceId = req.get("x-trace-id") || randomUUID();

  (req as any).traceId = traceId;

  const tenantId =
    (req as any)?.tenant?.info?.id ||
    req.get("x-tenant-id") ||
    (req as any)?.user?.tenantId ||
    "unknown";

  (req as any).context = {
    traceId,
    tenantId,
    locale: req.get("accept-language")?.split(",")[0] || "en-US",
    region: req.get("cf-ipcountry") || "unknown",
    startedAt: Date.now(),
  };

  next();
}



