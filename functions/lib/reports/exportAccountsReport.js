"use strict";
// ============================
// 📊 Export Accounts Report — v7.9.3 Clean Build (Firebase Admin Compatible)
// ============================
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportAccountsReport = exportAccountsReport;
const firebase_1 = require("src/services/firebase");
/**
 * Formata um array de contas em CSV
 */
function toCsv(accounts, tenantName) {
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
    const rows = accounts.map((acc) => [
        acc.id,
        acc.type,
        `"${(acc.description || "").replace(/"/g, '""')}"`,
        acc.amount ?? "",
        acc.dueDate ?? "",
        acc.status ?? "",
        acc.paidAt ?? "",
        acc.method ?? "",
        acc.reference ?? "",
    ].join(","));
    return [`"Relatório de Contas - ${tenantName}"`, headers.join(","), ...rows].join("\n");
}
/**
 * Exporta as contas do tenant em CSV
 */
async function exportAccountsReport(tenantId, tenantName, options = {}) {
    let query = firebase_1.db
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
        ...doc.data(),
        id: doc.id,
    }));
    return toCsv(accounts, tenantName);
}
