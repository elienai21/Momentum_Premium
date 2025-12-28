"use strict";
// ============================
// 🔁 Sync Module — Firestore ↔ Google Sheets (v8.0.0)
// ============================
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const requireAuth_1 = require("../middleware/requireAuth");
const errors_1 = require("../utils/errors");
const sheets_1 = require("../core/adapters/sheets");
const logger_1 = require("../utils/logger");
exports.syncRouter = (0, express_1.Router)();
// ============================
// 📥 Schemas
// ============================
const importBodySchema = zod_1.z.object({
    /**
     * ID da planilha do Google Sheets (trecho entre /d/ e / em
     * https://docs.google.com/spreadsheets/d/{sheetId}/edit).
     *
     * Se não for enviado, o backend pode usar um fallback (ex.: valor
     * configurado no adapter ou um ID padrão do tenant).
     */
    sheetId: zod_1.z.string().min(3).optional(),
});
// (Se quiser, no futuro dá pra criar também um schema para export)
// ============================
// 📥 POST /sync/import
// Importa dados do Google Sheets → Firestore
// ============================
exports.syncRouter.post("/import", requireAuth_1.requireAuth, async (req, res, next) => {
    try {
        if (!req.tenant || !req.tenant.info?.id) {
            throw new errors_1.ApiError(400, "Tenant context required.");
        }
        const tenantId = req.tenant.info.id;
        // Token do Google enviado pela camada de auth (header x-goog-access-token)
        const googleAccessToken = req.googleAccessToken;
        if (!googleAccessToken) {
            throw new errors_1.ApiError(400, "Google access token is required. Connect your Google account and try again.");
        }
        const { sheetId } = importBodySchema.parse(req.body ?? {});
        const adapter = await sheets_1.SheetsAdapter.fromUserToken(googleAccessToken);
        // Se sheetId não vier do front, o adapter pode usar um fallback interno
        const effectiveSheetId = sheetId || tenantId;
        const { importedCount } = await adapter.importSheetToFirestore(tenantId, effectiveSheetId);
        logger_1.logger.info("Sync import completed", {
            tenantId,
            importedCount,
            sheetId: effectiveSheetId,
        });
        res.json({ ok: true, importedCount });
    }
    catch (e) {
        if (e instanceof zod_1.z.ZodError) {
            logger_1.logger.warn("Sync import payload validation failed", {
                issues: e.issues,
            });
            return next(new errors_1.ApiError(400, "Invalid import payload."));
        }
        logger_1.logger.error("Sync import failed", { error: e.message });
        next(new errors_1.ApiError(500, e.message || "Import error"));
    }
});
// ============================
// 📤 POST /sync/export
// Exporta dados do Firestore → Google Sheets / Drive
// ============================
exports.syncRouter.post("/export", requireAuth_1.requireAuth, async (req, res, next) => {
    try {
        if (!req.tenant || !req.tenant.info?.id) {
            throw new errors_1.ApiError(400, "Tenant context required.");
        }
        const tenantId = req.tenant.info.id;
        const googleAccessToken = req.googleAccessToken;
        if (!googleAccessToken) {
            throw new errors_1.ApiError(400, "Google access token is required. Connect your Google account and try again.");
        }
        const adapter = await sheets_1.SheetsAdapter.fromUserToken(googleAccessToken);
        // ✅ fallback caso exportSheetToGoogleDrive não exista
        const exportFn = adapter.exportSheetToGoogleDrive ||
            adapter.exportSheetFromFirestore;
        if (!exportFn) {
            throw new Error("No valid export function found in SheetsAdapter.");
        }
        const { exportedCount } = await exportFn.call(adapter, tenantId);
        logger_1.logger.info("Sync export completed", {
            tenantId,
            exportedCount,
        });
        res.json({ ok: true, exportedCount });
    }
    catch (e) {
        logger_1.logger.error("Sync export failed", { error: e.message });
        next(new errors_1.ApiError(500, e.message || "Export error"));
    }
});
