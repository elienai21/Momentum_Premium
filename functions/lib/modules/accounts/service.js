"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAccount = createAccount;
exports.updateAccount = updateAccount;
exports.deleteAccount = deleteAccount;
exports.getAccountById = getAccountById;
exports.listAccounts = listAccounts;
const firebase_1 = require("../../services/firebase");
// ============================
// 💼 Accounts Service — Financial Ledger (refactor safe build)
// ============================
const logger_1 = require("../../utils/logger");
const errors_1 = require("../../utils/errors");
const COLLECTION = "accounts";
/**
 * 🧾 Cria uma nova conta no tenant especificado.
 */
async function createAccount(tenantId, dto) {
    if (!tenantId) {
        throw new errors_1.ApiError(400, "Missing tenantId for createAccount");
    }
    const ref = firebase_1.db.collection(COLLECTION).doc();
    const now = new Date().toISOString();
    const accountData = {
        ...dto,
        tenantId,
        createdAt: now,
        updatedAt: now,
        isDeleted: false,
    };
    await ref.set(accountData);
    logger_1.logger.info("Account created", {
        tenantId,
        accountId: ref.id,
    });
    return {
        id: ref.id,
        ...accountData,
    };
}
/**
 * ✏️ Atualiza uma conta existente.
 */
async function updateAccount(tenantId, accountId, dto) {
    if (!tenantId) {
        throw new errors_1.ApiError(400, "Missing tenantId for updateAccount");
    }
    if (!accountId) {
        throw new errors_1.ApiError(400, "Missing accountId for updateAccount");
    }
    const ref = firebase_1.db.collection(COLLECTION).doc(accountId);
    const snap = await ref.get();
    if (!snap.exists) {
        throw new errors_1.ApiError(404, "Account not found");
    }
    const existing = snap.data();
    if (existing.tenantId !== tenantId) {
        throw new errors_1.ApiError(403, "Account does not belong to this tenant");
    }
    const patch = {
        ...dto,
        updatedAt: new Date().toISOString(),
    };
    await ref.update(patch);
    const merged = { ...existing, ...patch };
    logger_1.logger.info("Account updated", {
        tenantId,
        accountId,
    });
    return {
        id: ref.id,
        ...merged,
    };
}
/**
 * 🗑️ Marca uma conta como removida (soft delete).
 */
async function deleteAccount(tenantId, accountId) {
    if (!tenantId) {
        throw new errors_1.ApiError(400, "Missing tenantId for deleteAccount");
    }
    if (!accountId) {
        throw new errors_1.ApiError(400, "Missing accountId for deleteAccount");
    }
    const ref = firebase_1.db.collection(COLLECTION).doc(accountId);
    const snap = await ref.get();
    if (!snap.exists) {
        throw new errors_1.ApiError(404, "Account not found");
    }
    const existing = snap.data();
    if (existing.tenantId !== tenantId) {
        throw new errors_1.ApiError(403, "Account does not belong to this tenant");
    }
    await ref.update({
        isDeleted: true,
        deletedAt: new Date().toISOString(),
    });
    logger_1.logger.info("Account soft-deleted", {
        tenantId,
        accountId,
    });
}
/**
 * 🔍 Busca uma conta por id.
 */
async function getAccountById(tenantId, accountId) {
    if (!tenantId || !accountId)
        return null;
    const ref = firebase_1.db.collection(COLLECTION).doc(accountId);
    const snap = await ref.get();
    if (!snap.exists)
        return null;
    const data = snap.data();
    if (data.tenantId !== tenantId || data.isDeleted) {
        return null;
    }
    return {
        id: snap.id,
        ...data,
    };
}
/**
 * 📋 Lista contas do tenant.
 */
async function listAccounts(tenantId) {
    if (!tenantId) {
        throw new errors_1.ApiError(400, "Missing tenantId for listAccounts");
    }
    const snap = await firebase_1.db
        .collection(COLLECTION)
        .where("tenantId", "==", tenantId)
        .where("isDeleted", "==", false)
        .orderBy("createdAt", "asc")
        .get();
    const accounts = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
    }));
    logger_1.logger.info("Accounts listed", {
        tenantId,
        count: accounts.length,
    });
    return accounts;
}
