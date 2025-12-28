import { db } from "src/services/firebase";
// ============================
// ⚠️ Global Error Handler (v7.9+)
// ============================

import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";
import { recordMetric } from "../utils/metrics";
import { ApiError } from "../utils/errors";

/**
 * Middleware global para tratamento de erros e logging estruturado.
 * Compatível com TypeScript 5 e Firebase Functions v5.
 */
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  // ✅ Garante statusCode, mesmo se err não for ApiError
  const status =
    err instanceof ApiError
      ? (err as any).statusCode || (err as any).status || 500
      : 500;

  // ✅ Logging consistente (sem 3º parâmetro)
  logger.error("Unhandled error", {
    traceId: (req as any)?.traceId,
    tenantId: (req as any)?.user?.tenantId,
    path: req.path,
    message: err?.message ?? "Unknown error",
    stack: err?.stack,
  });

  // ✅ Registro de métricas
  recordMetric("error_event", {
    route: req.path,
    tenantId: (req as any)?.user?.tenantId,
    code: status,
    message: err?.message ?? "Unknown error",
  });

  // ✅ Resposta JSON estruturada
  res.status(status).json({
    ok: false,
    error: err?.message ?? "Internal server error",
    traceId: (req as any)?.traceId,
  });
}



