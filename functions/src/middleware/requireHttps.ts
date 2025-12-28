import { db } from "src/services/firebase";
// src/middleware/requireHttps.ts
import { Request, Response, NextFunction } from "express";

export function requireHttps(req: Request, res: Response, next: NextFunction) {
  const proto = (req.headers["x-forwarded-proto"] || "").toString();
  if (proto && proto !== "https") {
    const url = `https://${req.headers.host}${req.originalUrl}`;
    return res.redirect(301, url);
  }
  next();
}



