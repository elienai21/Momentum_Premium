import { db } from "src/services/firebase";
// ============================
// ⚠️ errors.ts — Central Error Middleware (v7.9-FIX)
// ============================

import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

// Classe padrão de erro de API
export class ApiError extends Error {
  status: number;
  code?: string;
  extras?: any;

  constructor(status: number, message: string, code?: string, extras?: any) {
    super(message);
    this.status = status;
    this.code = code;
    this.extras = extras;
  }
}

// 404 — rota não encontrada
export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ ok: false, error: "Not Found" });
}

// Tratamento global de erros
export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  const status = err?.status ?? 500;

  // Corrigido: remove req como 3º argumento do logger
  logger.error("Unhandled error", {
    error: err?.stack ?? err?.message,
    code: err?.code,
    traceId: (req as any)?.traceId,
    path: req.path,
  });

  res.status(status).json({
    ok: false,
    error: err?.message ?? "Internal Error",
    code: err?.code ?? "INTERNAL",
    traceId: (req as any)?.traceId,
  });
}



