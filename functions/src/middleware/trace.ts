import { db } from "src/services/firebase";
// ============================
// 🧭 trace.ts — Request Tracing Middleware (v7.9-FIX)
// ============================

import { v4 as uuidv4 } from "uuid";
import { Request, Response, NextFunction } from "express";

/**
 * Adiciona um identificador único (traceId) a cada requisição
 * e inicializa o contexto de execução.
 */
export function attachTraceId(req: Request, _res: Response, next: NextFunction) {
  const traceId = uuidv4();

  // Evita erro de tipagem estendendo dinamicamente a request
  (req as any).traceId = traceId;
  (req as any).context = {
    traceId,
    startedAt: Date.now(),
  };

  next();
}



