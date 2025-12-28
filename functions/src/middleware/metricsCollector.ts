import { db } from "src/services/firebase";
// ============================
// 📊 metricsCollector.ts — Request Metrics Logger (v7.9-FIX)
// ============================

import { Request, Response, NextFunction } from "express";

import { logger } from "../utils/logger";

/**
 * Registra métricas de latência e status de cada requisição no Firestore.
 */
export async function metricsCollector(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on("finish", async () => {
    const latency = Date.now() - start;

    const entry = {
      route: req.originalUrl,
      method: req.method,
      latencyMs: latency,
      statusCode: res.statusCode,
      tenantId: (req as any)?.tenant?.info?.id ?? "anonymous",
      traceId: (req as any)?.traceId,
      timestamp: new Date().toISOString(),
    };

    try {
      await db.collection("system_metrics").add(entry);
    } catch (err: any) {
      logger.error("Failed to write metric", { error: err?.message, entry });
    }
  });

  next();
}



