// web/src/services/DedupApi.ts
import { api } from "./api";

export interface DuplicateTxn {
  id: string;
  date: string | null;
  description: string;
  amount: number;
  type: string;
  accountId?: string;
  createdAt?: string;
}

export interface DuplicateTxnGroup {
  fingerprint: string;
  count: number;
  sample: DuplicateTxn;
  docs: DuplicateTxn[];
  ids: string[];
}

interface PreviewResponse {
  status: "ok";
  totalScanned: number;
  groups: DuplicateTxnGroup[];
}

/**
 * Lista grupos de transações duplicadas (dentro de um limite de docs).
 * Futuramente podemos passar filtros (datas, conta, etc.).
 */
export async function previewDuplicateTransactions(): Promise<PreviewResponse> {
  const { data } = await api.get<PreviewResponse>(
    "/dedup/transactions/preview",
  );
  return data;
}

/**
 * Remove em batch as transações com IDs informados.
 */
export async function cleanupDuplicateTransactions(
  deleteIds: string[],
): Promise<{ status: string; deleted: number }> {
  const { data } = await api.post<{ status: string; deleted: number }>(
    "/dedup/transactions/cleanup",
    { deleteIds },
  );
  return data;
}
