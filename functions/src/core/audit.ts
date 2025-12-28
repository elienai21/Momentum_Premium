// functions/src/core/audit.ts
// Compat layer para o sistema de auditoria antigo (recordAudit)
// Agora escreve na mesma coleção "audit_logs" usada pelo novo auditService.

import { db } from "src/services/firebase";
import { logger } from "../utils/logger";

const COLLECTION = "audit_logs";

export interface LegacyAuditMeta {
  tenantId?: string;
  traceId?: string;
  [key: string]: any;
}

/**
 * ⚠️ Compat: recordAudit (LEGADO)
 *
 * Mantém a assinatura antiga:
 *   recordAudit(action, actorEmail, description, meta?)
 *
 * Agora grava documentos em "audit_logs" com um formato
 * compatível com o novo sistema, para não quebrar quem ainda
 * estiver usando esta função em outros módulos.
 */
export async function recordAudit(
  action: string,
  actorEmail: string,
  description: string,
  meta: LegacyAuditMeta = {}
): Promise<void> {
  try {
    const { tenantId, ...rest } = meta;

    const entry = {
      // Para compatilidade com o novo padrão:
      type: action, // mapeia action antiga -> type
      tenantId: tenantId ?? null,
      userId: actorEmail || "unknown",
      createdAt: new Date().toISOString(),
      origin: rest.origin || null,
      ip: rest.ip || null,
      userAgent: rest.userAgent || null,
      // payload compacto
      payload: {
        description,
        ...rest,
      },
    };

    await db.collection(COLLECTION).add(entry);

    logger.info("Legacy audit recorded via recordAudit", {
      action,
      actorEmail,
      tenantId: tenantId ?? null,
    });
  } catch (err: any) {
    logger.error("Failed to record legacy audit", {
      error: err?.message,
      action,
      actorEmail,
    });
  }
}

/**
 * Helper utilitário que já existia no sistema antigo.
 * Mantemos para reaproveitar em updates de documentos.
 *
 * Uso:
 *   await ref.update(withLastModified({ status: "paid" }, req.user?.email));
 */
export function withLastModified<T extends Record<string, any>>(
  data: T,
  actorEmail?: string
): T {
  return {
    ...data,
    lastModifiedAt: new Date().toISOString(),
    ...(actorEmail ? { lastModifiedBy: actorEmail } : {}),
  };
}

