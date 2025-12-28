import { db } from "src/services/firebase";
// ============================
// 💼 Accounts Service — Core Financial Ledger (v7.9.3 Final)
// ============================


import { AccountDto, AccountUpdateDto, AccountResponseDto } from "../contracts/accounts";
import { logger } from "../utils/logger";

/**
 * 🧾 Criar nova conta
 */
export async function createAccount(
  tenantId: string,
  dto: AccountDto
): Promise<AccountResponseDto> {
  if (!tenantId) throw new Error("Tenant ID is required.");
  if (!dto.name) throw new Error("Account name is required.");

  const ref = db.collection(`tenants/${tenantId}/accounts`).doc();

  const data = {
    id: ref.id,
    name: dto.name ?? "Conta sem nome",
    status: dto.status ?? "pending",
    amount: dto.amount ?? 0,
    dueDate: dto.dueDate ?? new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  await ref.set(data);

  logger.info("Account created", { tenantId, id: ref.id, name: data.name });

  return { ok: true, account: data };
}

/**
 * 🔄 Atualizar conta existente
 */
export async function updateAccount(
  tenantId: string,
  dto: AccountUpdateDto
): Promise<AccountResponseDto> {
  if (!tenantId) throw new Error("Tenant ID is required.");
  if (!dto.id) throw new Error("Account ID is required.");

  const ref = db.doc(`tenants/${tenantId}/accounts/${dto.id}`);

  const updatedData = {
    id: dto.id,
    name: dto.name ?? "Conta atualizada",
    status: dto.status ?? "pending",
    amount: dto.amount ?? 0,
    dueDate: dto.dueDate ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await ref.update(updatedData);

  logger.info("Account updated", { tenantId, id: dto.id, name: updatedData.name });

  return { ok: true, account: updatedData };
}

/**
 * 📋 Listar contas
 */
export async function listAccounts(tenantId: string): Promise<AccountDto[]> {
  const snap = await db.collection(`tenants/${tenantId}/accounts`).limit(100).get();
  const accounts = snap.docs.map(
    (d: FirebaseFirestore.QueryDocumentSnapshot) => ({ id: d.id, ...d.data() })
  ) as AccountDto[];

  logger.info("Accounts listed", { tenantId, count: accounts.length });
  return accounts;
}



