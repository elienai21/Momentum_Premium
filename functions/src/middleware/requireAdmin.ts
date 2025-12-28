import { db } from "src/services/firebase";
import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/errors";

/**
 * Garante que o usuário autenticado é administrador.
 */
export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  const user = (req as any)?.user;
  if (!user || !user.isAdmin) {
    return next(new ApiError(403, "Forbidden: Administrator access required."));
  }
  next();
}



