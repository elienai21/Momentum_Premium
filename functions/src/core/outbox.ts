import { db } from "src/services/firebase";
// src/core/outbox.ts

import { logger } from "../utils/logger";

type OutboxEvent = {
  id?: string;
  type: "USAGE_REPORTED" | "ADVISOR_ALERT" | "TENANT_CREATED" | "WEBHOOK_FAILED";
  payload: any;
  tenantId?: string;
  createdAt: string;
};

const OUTBOX = "outbox";
const OUTBOX_PROCESSED = "outbox_processed";

export async function enqueueEvent(evt: Omit<OutboxEvent, "createdAt">) {
  const doc = { ...evt, createdAt: new Date().toISOString() };
  await db.collection(OUTBOX).add(doc);
  return true;
}

export async function dispatchPending(batchSize = 25) {
  const snap = await db.collection(OUTBOX).orderBy("createdAt","asc").limit(batchSize).get();
  if (snap.empty) return 0;

  let processed = 0;
  for (const d of snap.docs) {
    const evt = d.data() as OutboxEvent;
    const id = d.id;
    const processedRef = db.collection(OUTBOX_PROCESSED).doc(id);

    // idempotência
    const already = await processedRef.get();
    if (already.exists) {
      await d.ref.delete();
      continue;
    }

    try {
      await handle(evt);                      // <- seu roteador de handlers
      await processedRef.set({ at: Date.now(), type: evt.type });
      await d.ref.delete();
      processed++;
    } catch (error) {
      logger.error("Outbox dispatch failed", { id, error });
      // mantenha no outbox para retry futuro
    }
  }
  return processed;
}

// Roteia para handlers específicos. Amplie conforme necessário.
async function handle(evt: OutboxEvent) {
  switch (evt.type) {
    case "USAGE_REPORTED":
      // no-op (já reportado) — usado p/ confirmar no BI
      return;
    case "ADVISOR_ALERT":
      // ex.: enviar email/push (chame seu módulo de notificações)
      return;
    case "TENANT_CREATED":
      // provisionar defaults / seeds
      return;
    case "WEBHOOK_FAILED":
      // notificar time e abrir incidente
      return;
    default:
      return;
  }
}



