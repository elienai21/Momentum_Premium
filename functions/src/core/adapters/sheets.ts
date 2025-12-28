import { db } from "src/services/firebase";
import { sheets_v4 } from "googleapis";

import {
  getGoogleClient,
  getServiceAccountGoogleClient,
} from "../../utils/google";
import { logger } from "../../utils/logger";
import { RecordItem } from "../../types";

export class SheetsAdapter {
  private sheets: sheets_v4.Sheets;

  constructor(sheetsClient: sheets_v4.Sheets) {
    this.sheets = sheetsClient;
  }

  /**
   * Cria um adapter usando o access token do usuário (OAuth Google).
   */
  static async fromUserToken(accessToken: string): Promise<SheetsAdapter> {
    const { sheets } = getGoogleClient(accessToken);
    return new SheetsAdapter(sheets);
  }

  /**
   * Cria um adapter usando service account (integrações server-to-server).
   */
  static async fromServiceAccount(): Promise<SheetsAdapter> {
    const { sheets } = await getServiceAccountGoogleClient();
    return new SheetsAdapter(sheets);
  }

  /**
   * Importa dados de uma planilha do Google Sheets para o Firestore.
   *
   * @param tenantId ID do tenant no Firestore
   * @param sheetId  ID da planilha (trecho entre /d/ e / na URL do Sheets)
   */
  async importSheetToFirestore(
    tenantId: string,
    sheetId: string,
  ): Promise<{ importedCount: number }> {
    logger.info("Starting sheet import to Firestore", { tenantId, sheetId });

    // Aba e colunas esperadas no template:
    // Items!A:E -> [DATE, DESCRIPTION, NUMERIC_DATA, SUB_TYPE, TYPE]
    const range = "Items!A:E";

    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range,
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) {
      logger.warn("Sheet has no data to import", { sheetId, tenantId });
      return { importedCount: 0 };
    }

    // Ignora a linha de cabeçalho (linha 0)
    const transactions: Partial<RecordItem>[] = rows.slice(1).map((row) => {
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
      } as Partial<RecordItem>;
    });

    const collectionRef = db.collection(`tenants/${tenantId}/transactions`);
    const batch = db.batch();

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

    logger.info("Sheet import to Firestore completed", {
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
  async exportFirestoreToSheet(
    tenantId: string,
    sheetId: string,
  ): Promise<{ exportedCount: number }> {
    logger.info("Starting Firestore export to sheet", { tenantId, sheetId });

    const snap = await db
      .collection(`tenants/${tenantId}/transactions`)
      .orderBy("date", "desc")
      .limit(500)
      .get();

    const records = snap.docs.map(
      (doc: FirebaseFirestore.QueryDocumentSnapshot) => doc.data() as RecordItem
    );

    if (records.length === 0) {
      logger.info("No records in Firestore to export", { tenantId });
      return { exportedCount: 0 };
    }

    const range = "Items!A1";
    const headers = ["DATE", "DESCRIPTION", "NUMERIC_DATA", "TYPE", "SUB_TYPE"];
    const values: any[][] = [headers];

    records.forEach((rec: RecordItem) => {
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

    logger.info("Firestore export to sheet completed", {
      tenantId,
      sheetId,
      exportedCount: records.length,
    });

    return { exportedCount: records.length };
  }
}


