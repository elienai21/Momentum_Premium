"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enqueueEvent = enqueueEvent;
exports.dispatchPending = dispatchPending;
const firebase_1 = require("src/services/firebase");
// src/core/outbox.ts
const logger_1 = require("../utils/logger");
const OUTBOX = "outbox";
const OUTBOX_PROCESSED = "outbox_processed";
async function enqueueEvent(evt) {
    const doc = { ...evt, createdAt: new Date().toISOString() };
    await firebase_1.db.collection(OUTBOX).add(doc);
    return true;
}
async function dispatchPending(batchSize = 25) {
    const snap = await firebase_1.db.collection(OUTBOX).orderBy("createdAt", "asc").limit(batchSize).get();
    if (snap.empty)
        return 0;
    let processed = 0;
    for (const d of snap.docs) {
        const evt = d.data();
        const id = d.id;
        const processedRef = firebase_1.db.collection(OUTBOX_PROCESSED).doc(id);
        // idempotência
        const already = await processedRef.get();
        if (already.exists) {
            await d.ref.delete();
            continue;
        }
        try {
            await handle(evt); // <- seu roteador de handlers
            await processedRef.set({ at: Date.now(), type: evt.type });
            await d.ref.delete();
            processed++;
        }
        catch (error) {
            logger_1.logger.error("Outbox dispatch failed", { id, error });
            // mantenha no outbox para retry futuro
        }
    }
    return processed;
}
// Roteia para handlers específicos. Amplie conforme necessário.
async function handle(evt) {
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
