import { db } from "src/services/firebase";
// ============================
// 🧩 Compliance (LGPD) — v7.9.3 Final
// ============================

import { Router, Request, Response, NextFunction } from "express";
import * as admin from "firebase-admin";
import { requireAuth } from "../middleware/requireAuth";
import { ApiError } from "./errors";
import { logger } from "./logger";

export const complianceRouter = Router();

/**
 * 🔸 POST /api/compliance/consent
 * Registra consentimento do usuário (LGPD)
 */
complianceRouter.post(
  "/consent",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const uid = req.user?.uid ?? "anonymous";
      const tenantId = req.tenant?.info?.id ?? "unknown";

      await db.collection("privacy_consents").doc(uid).set({
        accepted: true,
        acceptedAt: new Date().toISOString(),
        ip: req.ip,
        userAgent: req.headers["user-agent"] || "",
        tenantId,
      });

      logger.info("User consent recorded", { uid, tenantId });
      res.json({ ok: true, uid, tenantId });
    } catch (err: any) {
      logger.error("Failed to record user consent", { error: err?.message });
      next(new ApiError(500, "Erro ao registrar consentimento do usuário."));
    }
  }
);

/**
 * 🔸 GET /api/compliance/export
 * Exporta dados pessoais do usuário para atender à LGPD.
 */
complianceRouter.get(
  "/export",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const uid = req.user?.uid ?? "anonymous";
      const tenantId = req.tenant?.info?.id ?? "unknown";
      const txSnap = await db
        .collection("transactions")
        .where("userId", "==", uid)
        .get();

      const data = {
        user: {
          uid,
          email: req.user?.email ?? null,
          tenantId,
        },
        transactions: txSnap.docs.map((d: FirebaseFirestore.QueryDocumentSnapshot) => d.data()),
        exportedAt: new Date().toISOString(),
      };

      logger.info("User data export completed", {
        uid,
        tenantId,
        txCount: data.transactions.length,
      });

      res
        .setHeader("Content-Type", "application/json")
        .setHeader("Content-Disposition", 'attachment; filename="userData.json"')
        .status(200)
        .send(JSON.stringify(data, null, 2));
    } catch (err: any) {
      logger.error("Failed to export user data", { error: err?.message });
      next(new ApiError(500, "Erro ao exportar dados do usuário."));
    }
  }
);



