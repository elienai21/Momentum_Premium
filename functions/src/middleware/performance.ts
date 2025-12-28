import { db } from "src/services/firebase";
// ============================
// ⚡ performance.ts — Performance Logger (v7.9-FIX)
// ============================

import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

/**
 * Middleware para medir e registrar o tempo de execução de cada requisição.
 */
export function perfLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;

    // ✅ Corrigido: remove o terceiro argumento “req”
    logger.info(`[Perf] ${req.method} ${req.originalUrl} - ${res.statusCode} [${duration}ms]`, {
      traceId: (req as any)?.traceId,
      tenant: (req as any)?.tenant?.info?.id,
      user: (req as any)?.user?.email ?? "anonymous",
      duration,
    });
  });

  next();
}



