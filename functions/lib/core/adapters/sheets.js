"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SheetsAdapter = void 0;
const firebase_1 = require("src/services/firebase");
const google_1 = require("../../utils/google");
const logger_1 = require("../../utils/logger");
class SheetsAdapter {
    sheets;
    constructor(sheetsClient) {
        this.sheets = sheetsClient;
    }
    /**
     * Cria um adapter usando o access token do usuário (OAuth Google).
     */
    static async fromUserToken(accessToken) {
        const { sheets } = (0, google_1.getGoogleClient)(accessToken);
        return new SheetsAdapter(sheets);
    }
    /**
     * Cria um adapter usando service account (integrações server-to-server).
     */
    static async fromServiceAccount() {
        const { sheets } = await (0, google_1.getServiceAccountGoogleClient)();
        return new SheetsAdapter(sheets);
    }
    /**
     * Importa dados de uma planilha do Google Sheets para o Firestore.
     *
     * @param tenantId ID do tenant no Firestore
     * @param sheetId  ID da planilha (trecho entre /d/ e / na URL do Sheets)
     */
    async importSheetToFirestore(tenantId, sheetId) {
        logger_1.logger.info("Starting sheet import to Firestore", { tenantId, sheetId });
        // Aba e colunas esperadas no template:
        // Items!A:E -> [DATE, DESCRIPTION, NUMERIC_DATA, SUB_TYPE, TYPE]
        const range = "Items!A:E";
        const response = await this.sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range,
        });
        const rows = response.data.values;
        if (!rows || rows.length < 2) {
            logger_1.logger.warn("Sheet has no data to import", { sheetId, tenantId });
            return { importedCount: 0 };
        }
        // Ignora a linha de cabeçalho (linha 0)
        const transactions = rows.slice(1).map((row) => {
            // row[2] pode vir como "1234,56" ou "R$ 1.234,56"
            const rawAmount = String(row[2] ?? "0")
                .replace(/[R$\s.]/g, "")
                .replace(",", ".");
            const amount = Number.isNaN(parseFloat(rawAmount))
                ? 0
                : parseFloat(rawAmount);
            return {
                date: row[0] || new Date().toISOString().split("T")[0],
                description: row[1] || "N/A",
                amount,
                subType: row[3] || "Outros",
                type: row[4] === "Income" ? "Income" : "Expense",
                status: "paid", // assumimos que lançamentos importados já estão pagos
            };
        });
        const collectionRef = firebase_1.db.collection(`tenants/${tenantId}/transactions`);
        const batch = firebase_1.db.batch();
        const nowIso = new Date().toISOString();
        transactions.forEach((tx) => {
            const docRef = collectionRef.doc();
            batch.set(docRef, {
                ...tx,
                importedFromSheet: true,
                createdAt: nowIso,
            });
        });
        await batch.commit();
        logger_1.logger.info("Sheet import to Firestore completed", {
            tenantId,
            sheetId,
            importedCount: transactions.length,
        });
        return { importedCount: transactions.length };
    }
    /**
     * Exporta transações do Firestore para uma planilha do Google Sheets.
     *
     * @param tenantId ID do tenant no Firestore
     * @param sheetId  ID da planilha destino
     */
    async exportFirestoreToSheet(tenantId, sheetId) {
        logger_1.logger.info("Starting Firestore export to sheet", { tenantId, sheetId });
        const snap = await firebase_1.db
            .collection(`tenants/${tenantId}/transactions`)
            .orderBy("date", "desc")
            .limit(500)
            .get();
        const records = snap.docs.map((doc) => doc.data());
        if (records.length === 0) {
            logger_1.logger.info("No records in Firestore to export", { tenantId });
            return { exportedCount: 0 };
        }
        const range = "Items!A1";
        const headers = ["DATE", "DESCRIPTION", "NUMERIC_DATA", "TYPE", "SUB_TYPE"];
        const values = [headers];
        records.forEach((rec) => {
            values.push([
                rec.date,
                rec.description,
                rec.amount,
                rec.type,
                rec.subType,
            ]);
        });
        // Limpa a região antes de escrever
        await this.sheets.spreadsheets.values.clear({
            spreadsheetId: sheetId,
            range: "Items!A:E",
        });
        await this.sheets.spreadsheets.values.update({
            spreadsheetId: sheetId,
            range,
            valueInputOption: "USER_ENTERED",
            requestBody: { values },
        });
        logger_1.logger.info("Firestore export to sheet completed", {
            tenantId,
            sheetId,
            exportedCount: records.length,
        });
        return { exportedCount: records.length };
    }
}
exports.SheetsAdapter = SheetsAdapter;
