import { db } from "src/services/firebase";
// src/utils/trace.ts
import { Request } from "express";
import { randomUUID } from "crypto";

export function ensureTraceId(req: Request) {
  // Aceita header apenas para logging cruzado, mas se vier vazio, gera
  const inbound = (req.headers["x-trace-id"] || "").toString().trim();
  const safe = inbound && inbound.length >= 8 && inbound.length <= 64 ? inbound : randomUUID();
  (req as any).traceId = safe;
}



