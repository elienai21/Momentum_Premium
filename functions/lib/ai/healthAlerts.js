"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processHealthAlerts = void 0;
exports.sendHealthAlerts = sendHealthAlerts;
const firebase_1 = require("src/services/firebase");
const logger_1 = require("../utils/logger");
async function sendHealthAlerts(...args) {
    const userId = args[0];
    const doc = await firebase_1.db.collection('user_prefs').doc(userId).get();
    const prefs = doc.data() || {};
    if (!prefs?.enabled)
        return;
    const recipients = prefs.recipients || [];
    for (const r of recipients) {
        logger_1.logger.info('Health alert sent', { userId, to: r });
    }
}
exports.processHealthAlerts = sendHealthAlerts;
