import { db } from "src/services/firebase";
// ============================
// 🛑 rateLimiter.ts — Simple Rate Limiter (v7.9.2)
// ============================

import { Request, Response, NextFunction } from "express";

/**
 * Placeholder de limitador de requisições — substituível por uma versão avançada.
 */
export function rateLimiter(req: Request, res: Response, next: NextFunction) {
  try {
    // Exemplo básico: limitar payloads maiores que 2MB
    const length = Number(req.headers["content-length"] || 0);
    if (length > 2 * 1024 * 1024) {
      return res.status(413).json({ error: "Payload too large" });
    }

    // Aqui futuramente: integração com Redis ou Firestore p/ limitar IP/tenant
    next();
  } catch (e) {
    console.error("Rate limiter error:", e);
    next();
  }
}



