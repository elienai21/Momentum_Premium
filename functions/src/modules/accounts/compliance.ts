import { db } from "src/services/firebase";
// ============================
// 🧾 Accounts Compliance — LGPD / GDPR Export (refactor + audit)
// ============================

import { Request, Response, NextFunction, Router } from "express";
import "../../types"; // garante tipos extendidos de Request
import { requireAuth } from "../../middleware/requireAuth";
import { logger } from "../../utils/logger";
import { ApiError } from "../../utils/errors";
import { logActionFromRequest } from "../audit/auditService";

export const accountRouter = Router();

// Apenas usuário autenticado pode exportar os próprios dados
accountRouter.use(requireAuth);

/**
 * GET /api/accounts/compliance/export
 *
 * Exporta dados de contas ligados ao tenant (se houver contexto de tenant)
 * ou, como fallback, todas as contas não deletadas.
 *
 * Essa rota é pensada para LGPD / GDPR export (download de dados financeiros).
 */
accountRouter.get(
  "/export",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const uid = req.user?.uid;
      if (!uid) {
        throw new ApiError(401, "Auth required");
      }

      // Tenta obter tenantId do contexto, se existir
      const tenantId =
        (req.tenant as any)?.id ||
        (req.tenant as any)?.info?.id ||
        undefined;

      let query: FirebaseFirestore.Query = db
        .collection("accounts")
        .where("isDeleted", "==", false);

      if (tenantId) {
        // Se houver tenant em contexto, filtra por tenantId
        query = query.where("tenantId", "==", tenantId);
      }

      const snap = await query.get();
      const exportData = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Record<string, any>),
      }));

      // 🔎 Auditoria: registra export de contas
      await logActionFromRequest(req, "account.compliance.export", {
        count: exportData.length,
        hasTenantContext: Boolean(tenantId),
      });

      return res.status(200).json({
        ok: true,
        data: exportData,
        traceId: (req as any).traceId,
      });
    } catch (error: any) {
      logger.error("Account export failed", { error: error.message });
      next(error);
    }
  }
);


