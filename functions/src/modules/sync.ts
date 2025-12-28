// ============================
// 🔁 Sync Module — Firestore ↔ Google Sheets (v8.0.0)
// ============================

import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";

import { requireAuth } from "../middleware/requireAuth";
import { ApiError } from "../utils/errors";
import { SheetsAdapter } from "../core/adapters/sheets";
import { logger } from "../utils/logger";

export const syncRouter = Router();

// ============================
// 📥 Schemas
// ============================

const importBodySchema = z.object({
  /**
   * ID da planilha do Google Sheets (trecho entre /d/ e / em
   * https://docs.google.com/spreadsheets/d/{sheetId}/edit).
   *
   * Se não for enviado, o backend pode usar um fallback (ex.: valor
   * configurado no adapter ou um ID padrão do tenant).
   */
  sheetId: z.string().min(3).optional(),
});

// (Se quiser, no futuro dá pra criar também um schema para export)

// ============================
// 📥 POST /sync/import
// Importa dados do Google Sheets → Firestore
// ============================

syncRouter.post(
  "/import",
  requireAuth as any,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.tenant || !req.tenant.info?.id) {
        throw new ApiError(400, "Tenant context required.");
      }

      const tenantId = req.tenant.info.id;

      // Token do Google enviado pela camada de auth (header x-goog-access-token)
      const googleAccessToken = (req as any).googleAccessToken as
        | string
        | undefined;

      if (!googleAccessToken) {
        throw new ApiError(
          400,
          "Google access token is required. Connect your Google account and try again.",
        );
      }

      const { sheetId } = importBodySchema.parse(req.body ?? {});

      const adapter = await SheetsAdapter.fromUserToken(googleAccessToken);

      // Se sheetId não vier do front, o adapter pode usar um fallback interno
      const effectiveSheetId = sheetId || tenantId;

      const { importedCount } = await adapter.importSheetToFirestore(
        tenantId,
        effectiveSheetId,
      );

      logger.info("Sync import completed", {
        tenantId,
        importedCount,
        sheetId: effectiveSheetId,
      });

      res.json({ ok: true, importedCount });
    } catch (e: any) {
      if (e instanceof z.ZodError) {
        logger.warn("Sync import payload validation failed", {
          issues: e.issues,
        });
        return next(new ApiError(400, "Invalid import payload."));
      }

      logger.error("Sync import failed", { error: e.message });
      next(new ApiError(500, e.message || "Import error"));
    }
  },
);

// ============================
// 📤 POST /sync/export
// Exporta dados do Firestore → Google Sheets / Drive
// ============================

syncRouter.post(
  "/export",
  requireAuth as any,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.tenant || !req.tenant.info?.id) {
        throw new ApiError(400, "Tenant context required.");
      }

      const tenantId = req.tenant.info.id;

      const googleAccessToken = (req as any).googleAccessToken as
        | string
        | undefined;

      if (!googleAccessToken) {
        throw new ApiError(
          400,
          "Google access token is required. Connect your Google account and try again.",
        );
      }

      const adapter = await SheetsAdapter.fromUserToken(googleAccessToken);

      // ✅ fallback caso exportSheetToGoogleDrive não exista
      const exportFn =
        (adapter as any).exportSheetToGoogleDrive ||
        (adapter as any).exportSheetFromFirestore;

      if (!exportFn) {
        throw new Error("No valid export function found in SheetsAdapter.");
      }

      const { exportedCount } = await exportFn.call(adapter, tenantId);

      logger.info("Sync export completed", {
        tenantId,
        exportedCount,
      });

      res.json({ ok: true, exportedCount });
    } catch (e: any) {
      logger.error("Sync export failed", { error: e.message });
      next(new ApiError(500, e.message || "Export error"));
    }
  },
);
