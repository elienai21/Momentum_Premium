import { db } from "src/services/firebase";
// src/middleware/metricsLogger.ts
import { Request, Response, NextFunction } from "express";
import { recordLatency } from "../utils/metrics";

export function metricsLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on("finish", () => {
    const latency = Date.now() - start;
    recordLatency(req.path, latency, req.user?.tenantId);
  });
  next();
}



