// ============================
// 📊 Export Accounts Report — v7.9.3 Clean Build (Firebase Admin Compatible)
// ============================

import { db } from "src/services/firebase";
import { Account } from "../types";

type ExportOptions = {
  status?: "pending" | "under_review" | "paid" | "overdue";
  type?: "payable" | "receivable";
};

/**
 * Formata um array de contas em CSV
 */
function toCsv(accounts: (Account & { id: string })[], tenantName: string): string {
  const headers = [
    "ID",
    "Type",
    "Description",
    "Amount",
    "Due Date",
    "Status",
    "Paid At",
    "Method",
    "Reference",
  ];

  const rows = accounts.map((acc) =>
    [
      acc.id,
      acc.type,
      `"${(acc.description || "").replace(/"/g, '""')}"`,
      acc.amount ?? "",
      acc.dueDate ?? "",
      acc.status ?? "",
      acc.paidAt ?? "",
      acc.method ?? "",
      acc.reference ?? "",
    ].join(",")
  );

  return [`"Relatório de Contas - ${tenantName}"`, headers.join(","), ...rows].join("\n");
}

/**
 * Exporta as contas do tenant em CSV
 */
export async function exportAccountsReport(
  tenantId: string,
  tenantName: string,
  options: ExportOptions = {}
): Promise<string> {
  let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db
    .collection(`tenants/${tenantId}/accounts`)
    .orderBy("dueDate", "desc");

  if (options.status) {
    query = query.where("status", "==", options.status);
  }
  if (options.type) {
    query = query.where("type", "==", options.type);
  }

  const snap = await query.get();

  const accounts = snap.docs.map((doc) => ({
    ...(doc.data() as Account),
    id: doc.id,
    }));


  return toCsv(accounts, tenantName);
}

