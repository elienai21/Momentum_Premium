import { db } from "src/services/firebase";

import { Request, Response, NextFunction } from 'express'
import * as admin from 'firebase-admin'

export async function decodeFirebaseToken(req: any, _res: Response, next: NextFunction) {
  try {
    const h = req.headers.authorization || ""
    const m = h.match(/^Bearer (.+)$/)
    if (!m) return next()
    const decoded = await admin.auth().verifyIdToken(m[1])
    req.user = {
      uid: decoded.uid,
      email: decoded.email || null,
      tenantId: (decoded as any).tenantId || (decoded as any).tenant || null,
      admin: !!(decoded as any).admin
    }
  } catch (e) { /* proceed without user */ }
  next()
}
export function requireAuth(req: any, _res: Response, next: NextFunction) {
  if (!req.user?.uid) return next(new Error("Unauthorized"))
  next()
}

export function requireAdmin(req: any, _res: Response, next: NextFunction) {
  if (!req.user?.admin) return next(new Error("Forbidden"))
  next()
}



