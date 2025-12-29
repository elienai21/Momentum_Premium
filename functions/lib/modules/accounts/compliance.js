"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.accountRouter = void 0;
const firebase_1 = require("../../services/firebase");
// ============================
// 🧾 Accounts Compliance — LGPD / GDPR Export (refactor + audit)
// ============================
const express_1 = require("express");
require("../../types"); // garante tipos extendidos de Request
const requireAuth_1 = require("../../middleware/requireAuth");
const logger_1 = require("../../utils/logger");
const errors_1 = require("../../utils/errors");
const auditService_1 = require("../audit/auditService");
exports.accountRouter = (0, express_1.Router)();
// Apenas usuário autenticado pode exportar os próprios dados
exports.accountRouter.use(requireAuth_1.requireAuth);
/**
 * GET /api/accounts/compliance/export
 *
 * Exporta dados de contas ligados ao tenant (se houver contexto de tenant)
 * ou, como fallback, todas as contas não deletadas.
 *
 * Essa rota é pensada para LGPD / GDPR export (download de dados financeiros).
 */
exports.accountRouter.get("/export", async (req, res, next) => {
    try {
        const uid = req.user?.uid;
        if (!uid) {
            throw new errors_1.ApiError(401, "Auth required");
        }
        // Tenta obter tenantId do contexto, se existir
        const tenantId = req.tenant?.id ||
            req.tenant?.info?.id ||
            undefined;
        let query = firebase_1.db
            .collection("accounts")
            .where("isDeleted", "==", false);
        if (tenantId) {
            // Se houver tenant em contexto, filtra por tenantId
            query = query.where("tenantId", "==", tenantId);
        }
        const snap = await query.get();
        const exportData = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
        }));
        // 🔎 Auditoria: registra export de contas
        await (0, auditService_1.logActionFromRequest)(req, "account.compliance.export", {
            count: exportData.length,
            hasTenantContext: Boolean(tenantId),
        });
        return res.status(200).json({
            ok: true,
            data: exportData,
            traceId: req.traceId,
        });
    }
    catch (error) {
        logger_1.logger.error("Account export failed", { error: error.message });
        next(error);
    }
});
