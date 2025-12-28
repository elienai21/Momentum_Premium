// functions/src/routes/dedup.ts
import { Router, Request, Response } from "express";
import { getFirestore } from "firebase-admin/firestore";
import { requireAuth } from "../middleware/requireAuth";
import { withTenant } from "../middleware/withTenant";
import { logger } from "../utils/logger";

type AuthedRequest = Request & {
  tenant?: { info?: { id: string } };
  user?: { uid: string };
};

const dedupRouter = Router();

// Todas as rotas exigem usuário autenticado + tenant resolvido
dedupRouter.use(requireAuth, withTenant);

/**
 * Calcula uma "impressão digital" (fingerprint) da transação
 * para identificar duplicadas.
 *
 * Ajuste os campos se sua coleção de transactions tiver nomes diferentes.
 */
function buildTxnFingerprint(data: FirebaseFirestore.DocumentData): string {
  const date =
    (data.dateKey as string) ||
    (typeof data.date === "string"
      ? data.date.slice(0, 10)
      : "") ||
    "";

  const amount = Number(data.amount ?? 0);
  const type = (data.type as string) || "debit";

  const accountId = (data.accountId as string) || "";

  const desc = ((data.description as string) || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  return [
    date || "no-date",
    amount.toFixed(2),
    type,
    accountId || "no-account",
    desc || "no-desc",
  ].join("|");
}

/**
 * GET /apiV2/dedup/transactions/preview
 *
 * Retorna grupos de transações que parecem duplicadas,
 * baseado na fingerprint.
 *
 * Obs: para não explodir, limitamos o scan em até MAX_DOCS docs.
 */
dedupRouter.get(
  "/transactions/preview",
  async (req: AuthedRequest, res: Response) => {
    try {
      const tenantId = req.tenant?.info?.id;
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant não encontrado." });
      }

      const db = getFirestore();
      const MAX_DOCS = 3000;

      const snap = await db
        .collection(`tenants/${tenantId}/transactions`)
        .limit(MAX_DOCS)
        .get();

      const groupsMap = new Map<
        string,
        {
          fingerprint: string;
          docs: {
            id: string;
            date: string | null;
            description: string;
            amount: number;
            type: string;
            accountId?: string;
            createdAt?: string;
          }[];
        }
      >();

      snap.forEach((doc) => {
        const data = doc.data();
        const fingerprint = buildTxnFingerprint(data);

        const dateRaw =
          (data.dateKey as string) ||
          (typeof data.date === "string" ? data.date : null);
        const amount = Number(data.amount ?? 0);

        const normalized = {
          id: doc.id,
          date: dateRaw,
          description: (data.description as string) || "",
          amount,
          type: (data.type as string) || "debit",
          accountId: (data.accountId as string) || undefined,
          createdAt:
            (data.createdAt as string) ||
            (data.createdAt instanceof Date
              ? data.createdAt.toISOString()
              : undefined),
        };

        const existing = groupsMap.get(fingerprint);
        if (existing) {
          existing.docs.push(normalized);
        } else {
          groupsMap.set(fingerprint, {
            fingerprint,
            docs: [normalized],
          });
        }
      });

      // Mantém apenas fingerprints com mais de 1 transação (duplicadas)
      const groups = Array.from(groupsMap.values())
        .filter((g) => g.docs.length > 1)
        .map((g) => ({
          fingerprint: g.fingerprint,
          count: g.docs.length,
          sample: g.docs[0],
          docs: g.docs,
          ids: g.docs.map((d) => d.id),
        }));

      logger.info("Dedup preview computed", {
        tenantId,
        groups: groups.length,
      });

      return res.status(200).json({
        status: "ok",
        totalScanned: snap.size,
        groups,
      });
    } catch (err: any) {
      logger.error("Error in /dedup/transactions/preview", {
        error: err?.message,
        stack: err?.stack,
      });
      return res.status(500).json({
        error: "Erro ao analisar duplicidades de transações.",
      });
    }
  },
);

/**
 * POST /apiV2/dedup/transactions/cleanup
 *
 * Body: { deleteIds: string[] }
 *
 * Deleta em batch as transações informadas (dentro do tenant atual).
 * A ideia é: o front mostra os grupos, o usuário escolhe quais IDs deletar,
 * e manda para este endpoint.
 */
dedupRouter.post(
  "/transactions/cleanup",
  async (req: AuthedRequest, res: Response) => {
    try {
      const tenantId = req.tenant?.info?.id;
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant não encontrado." });
      }

      const { deleteIds } = (req.body || {}) as {
        deleteIds?: string[];
      };

      if (!Array.isArray(deleteIds) || deleteIds.length === 0) {
        return res.status(400).json({
          error:
            "Campo 'deleteIds' deve ser um array de IDs de transações a serem removidas.",
        });
      }

      const db = getFirestore();
      const batch = db.batch();

      deleteIds.forEach((id) => {
        const ref = db.doc(`tenants/${tenantId}/transactions/${id}`);
        batch.delete(ref);
      });

      await batch.commit();

      logger.info("Dedup cleanup executed", {
        tenantId,
        deleted: deleteIds.length,
      });

      return res.status(200).json({
        status: "ok",
        deleted: deleteIds.length,
      });
    } catch (err: any) {
      logger.error("Error in /dedup/transactions/cleanup", {
        error: err?.message,
        stack: err?.stack,
      });
      return res.status(500).json({
        error: "Erro ao remover transações duplicadas.",
      });
    }
  },
);

export { dedupRouter };
