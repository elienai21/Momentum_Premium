"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncSheets = syncSheets;
const firebase_1 = require("../services/firebase");
const sheets_1 = require("./adapters/sheets");
const logger_1 = require("../utils/logger");
async function syncSheets(tenantId) {
    try {
        const tenantSnap = await firebase_1.db.collection('tenants').doc(tenantId).get();
        const tenant = tenantSnap.data();
        if (!tenant?.sheetId || !tenant.syncEnabled) {
            logger_1.logger.info(`Skipping sync for tenant ${tenantId}: not enabled or no sheetId.`);
            return;
        }
        const sheets = await sheets_1.SheetsAdapter.fromServiceAccount();
        await sheets.exportFirestoreToSheet(tenantId, tenant.sheetId);
    }
    catch (error) {
        logger_1.logger.error(`Failed to sync sheets for tenant ${tenantId}`, { error });
    }
}
