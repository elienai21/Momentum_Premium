// functions/src/modules/audit/auditService.ts
// Novo serviço de auditoria unificado (v1)

import { db } from "src/services/firebase";
import { logger } from "../../utils/logger";
import { ApiError } from "../../utils/errors";
import type { Request } from "express";
import "../../types";

const COLLECTION = "audit_logs";

export type AuditActionType =
  | "account.create"
  | "account.update"
  | "account.delete"
  | "account.review"
  | "account.pay.single"
  | "account.approve"
  | "account.list"
  | "account.detail"
  | "account.reconcile.ai"
  | "account.export.csv"
  | "account.confirm.batch"
  | "payment.pending.list"
  | "payment.confirm"
  | "import.sheet"
  | "import.excel"
  | "ocr.receipt"
  | "cfo.simulation.run"
  | "support.chat"
  | "support.feedback"
  | string;

export interface AuditLogEntry {
  id?: string;
  tenantId: string | null;
  userId: string;
  type: AuditActionType;
  createdAt: string; // ISO 8601
  origin?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  payload?: Record<string, any>;
}

/**
 * 🧾 Grava uma ação de auditoria com dados explícitos.
 */
export async function logAction(
  entry: Omit<AuditLogEntry, "id" | "createdAt">
): Promise<void> {
  const createdAt = new Date().toISOString();

  const doc: AuditLogEntry = {
    ...entry,
    createdAt,
  };

  await db.collection(COLLECTION).add(doc);

  logger.info("Audit log created", {
    tenantId: entry.tenantId,
    userId: entry.userId,
    type: entry.type,
  });
}

/**
 * 🧾 Helper para gravar auditoria a partir de um Request.
 * Usa req.user / req.tenant e permite passar um payload resumido.
 */
export async function logActionFromRequest(
  req: Request,
  type: AuditActionType,
  payload?: Record<string, any>,
  origin?: string
): Promise<void> {
  try {
    const tenantId =
      (req as any).tenant?.id ||
      (req as any).tenant?.info?.id ||
      (req as any).tenantId ||
      null;

    const userId =
      (req as any).user?.uid ||
      (req as any).user?.email ||
      "system";

    const ip =
      (req.headers["x-forwarded-for"] as string) ||
      (req.socket?.remoteAddress as string) ||
      null;

    const userAgent = (req.headers["user-agent"] as string) || null;

    // Evita payloads gigantes
    let safePayload: Record<string, any> | undefined = undefined;
    if (payload) {
      try {
        const str = JSON.stringify(payload);
        if (str.length > 4000) {
          safePayload = { truncated: true };
        } else {
          safePayload = payload;
        }
      } catch {
        safePayload = { invalid: true };
      }
    }

    await logAction({
      tenantId,
      userId,
      type,
      origin: origin || req.path,
      ip,
      userAgent,
      payload: safePayload,
    });
  } catch (err: any) {
    logger.error("Failed to log audit from request", {
      error: err?.message,
      type,
      path: (req as any).path,
    });
  }
}

export interface ListAuditOptions {
  limit?: number;
  from?: Date;
  to?: Date;
  userId?: string;
  type?: string;
}

/**
 * 🔍 Lista logs de auditoria de um tenant com filtros básicos.
 */
export async function listAuditLogs(
  tenantId: string,
  opts: ListAuditOptions = {}
): Promise<AuditLogEntry[]> {
  if (!tenantId) {
    throw new ApiError(400, "Missing tenantId for listAuditLogs");
  }

  let query: FirebaseFirestore.Query = db
    .collection(COLLECTION)
    .where("tenantId", "==", tenantId);

  if (opts.userId) {
    query = query.where("userId", "==", opts.userId);
  }

  if (opts.type) {
    query = query.where("type", "==", opts.type);
  }

  if (opts.from) {
    query = query.where("createdAt", ">=", opts.from.toISOString());
  }

  if (opts.to) {
    query = query.where("createdAt", "<=", opts.to.toISOString());
  }

  const limit =
    opts.limit && opts.limit > 0 && opts.limit <= 500 ? opts.limit : 100;

  query = query.orderBy("createdAt", "desc").limit(limit);

  const snap = await query.get();

  const items: AuditLogEntry[] = snap.docs.map((d) => {
    const data = d.data() as AuditLogEntry;
    return {
      id: d.id,
      ...data,
    };
  });

  logger.info("Audit logs listed", {
    tenantId,
    count: items.length,
  });

  return items;
}


