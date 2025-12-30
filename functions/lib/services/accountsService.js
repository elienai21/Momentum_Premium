"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAccount = createAccount;
exports.updateAccount = updateAccount;
exports.listAccounts = listAccounts;
const firebase_1 = require("src/services/firebase");
const logger_1 = require("../utils/logger");
/**
 * 🧾 Criar nova conta
 */
async function createAccount(tenantId, dto) {
    if (!tenantId)
        throw new Error("Tenant ID is required.");
    if (!dto.name)
        throw new Error("Account name is required.");
    const ref = firebase_1.db.collection(`tenants/${tenantId}/accounts`).doc();
    const data = {
        id: ref.id,
        name: dto.name ?? "Conta sem nome",
        status: dto.status ?? "pending",
        amount: dto.amount ?? 0,
        dueDate: dto.dueDate ?? new Date().toISOString(),
        createdAt: new Date().toISOString(),
    };
    await ref.set(data);
    logger_1.logger.info("Account created", { tenantId, id: ref.id, name: data.name });
    return { ok: true, account: data };
}
/**
 * 🔄 Atualizar conta existente
 */
async function updateAccount(tenantId, dto) {
    if (!tenantId)
        throw new Error("Tenant ID is required.");
    if (!dto.id)
        throw new Error("Account ID is required.");
    const ref = firebase_1.db.doc(`tenants/${tenantId}/accounts/${dto.id}`);
    const updatedData = {
        id: dto.id,
        name: dto.name ?? "Conta atualizada",
        status: dto.status ?? "pending",
        amount: dto.amount ?? 0,
        dueDate: dto.dueDate ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    await ref.update(updatedData);
    logger_1.logger.info("Account updated", { tenantId, id: dto.id, name: updatedData.name });
    return { ok: true, account: updatedData };
}
/**
 * 📋 Listar contas
 */
async function listAccounts(tenantId) {
    const snap = await firebase_1.db.collection(`tenants/${tenantId}/accounts`).limit(100).get();
    const accounts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    logger_1.logger.info("Accounts listed", { tenantId, count: accounts.length });
    return accounts;
}
