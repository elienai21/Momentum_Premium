import { db } from "src/services/firebase";
// ============================
// 💼 Accounts Service — Financial Ledger (refactor safe build)
// ============================

import { logger } from "../../utils/logger";
import { AccountDto, AccountUpdateDto } from "./contracts";
import { ApiError } from "../../utils/errors";

const COLLECTION = "accounts";

/**
 * 🧾 Cria uma nova conta no tenant especificado.
 */
export async function createAccount(
  tenantId: string,
  dto: AccountDto
) {
  if (!tenantId) {
    throw new ApiError(400, "Missing tenantId for createAccount");
  }

  const ref = db.collection(COLLECTION).doc();
  const now = new Date().toISOString();

  const accountData: any = {
    ...dto,
    tenantId,
    createdAt: now,
    updatedAt: now,
    isDeleted: false,
  };

  await ref.set(accountData);

  logger.info("Account created", {
    tenantId,
    accountId: ref.id,
  });

  return {
    id: ref.id,
    ...(accountData as Record<string, any>),
  };
}

/**
 * ✏️ Atualiza uma conta existente.
 */
export async function updateAccount(
  tenantId: string,
  accountId: string,
  dto: AccountUpdateDto
) {
  if (!tenantId) {
    throw new ApiError(400, "Missing tenantId for updateAccount");
  }
  if (!accountId) {
    throw new ApiError(400, "Missing accountId for updateAccount");
  }

  const ref = db.collection(COLLECTION).doc(accountId);
  const snap = await ref.get();

  if (!snap.exists) {
    throw new ApiError(404, "Account not found");
  }

  const existing = snap.data() as any;
  if (existing.tenantId !== tenantId) {
    throw new ApiError(403, "Account does not belong to this tenant");
  }

  const patch: any = {
    ...dto,
    updatedAt: new Date().toISOString(),
  };

  await ref.update(patch);

  const merged = { ...existing, ...patch };

  logger.info("Account updated", {
    tenantId,
    accountId,
  });

  return {
    id: ref.id,
    ...(merged as Record<string, any>),
  };
}

/**
 * 🗑️ Marca uma conta como removida (soft delete).
 */
export async function deleteAccount(
  tenantId: string,
  accountId: string
): Promise<void> {
  if (!tenantId) {
    throw new ApiError(400, "Missing tenantId for deleteAccount");
  }
  if (!accountId) {
    throw new ApiError(400, "Missing accountId for deleteAccount");
  }

  const ref = db.collection(COLLECTION).doc(accountId);
  const snap = await ref.get();

  if (!snap.exists) {
    throw new ApiError(404, "Account not found");
  }

  const existing = snap.data() as any;
  if (existing.tenantId !== tenantId) {
    throw new ApiError(403, "Account does not belong to this tenant");
  }

  await ref.update({
    isDeleted: true,
    deletedAt: new Date().toISOString(),
  });

  logger.info("Account soft-deleted", {
    tenantId,
    accountId,
  });
}

/**
 * 🔍 Busca uma conta por id.
 */
export async function getAccountById(
  tenantId: string,
  accountId: string
) {
  if (!tenantId || !accountId) return null;

  const ref = db.collection(COLLECTION).doc(accountId);
  const snap = await ref.get();

  if (!snap.exists) return null;

  const data = snap.data() as any;
  if (data.tenantId !== tenantId || data.isDeleted) {
    return null;
  }

  return {
    id: snap.id,
    ...(data as Record<string, any>),
  };
}

/**
 * 📋 Lista contas do tenant.
 */
export async function listAccounts(tenantId: string) {
  if (!tenantId) {
    throw new ApiError(400, "Missing tenantId for listAccounts");
  }

  const snap = await db
    .collection(COLLECTION)
    .where("tenantId", "==", tenantId)
    .where("isDeleted", "==", false)
    .orderBy("createdAt", "asc")
    .get();

  const accounts = snap.docs.map((d: FirebaseFirestore.QueryDocumentSnapshot) => ({
    id: d.id,
    ...(d.data() as Record<string, any>),
  }));

  logger.info("Accounts listed", {
    tenantId,
    count: accounts.length,
  });

  return accounts;
}


