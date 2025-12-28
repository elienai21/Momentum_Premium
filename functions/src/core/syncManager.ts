import { db } from "src/services/firebase";


import { SheetsAdapter } from "./adapters/sheets";
import { logger } from "../utils/logger";

export async function syncSheets(tenantId: string) {
  try {
    const tenantSnap = await db.collection('tenants').doc(tenantId).get();
    const tenant = tenantSnap.data();

    if (!tenant?.sheetId || !tenant.syncEnabled) {
      logger.info(`Skipping sync for tenant ${tenantId}: not enabled or no sheetId.`);
      return;
    }

    const sheets = await SheetsAdapter.fromServiceAccount();
    await sheets.exportFirestoreToSheet(tenantId, tenant.sheetId);
  } catch (error) {
    logger.error(`Failed to sync sheets for tenant ${tenantId}`, { error });
  }
}



