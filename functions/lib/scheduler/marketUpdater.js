"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.marketUpdater = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firebase_1 = require("../services/firebase");
const logger_1 = require("../utils/logger");
const bcbService_1 = require("../integrations/bcbService");
const newsService_1 = require("../services/newsService");
/**
 * Market Updater Job
 *
 * Runs daily at 08:00 AM to fetch latest economic indicators (Selic, IPCA, USD)
 * and update the 'latest' document in 'market_indicators' collection.
 */
exports.marketUpdater = (0, scheduler_1.onSchedule)({
    schedule: "0 8 * * *", // 08:00 AM daily
    timeZone: "America/Sao_Paulo",
    region: "southamerica-east1",
    timeoutSeconds: 300,
    memory: "256MiB",
}, async (event) => {
    logger_1.logger.info("Market Updater: Starting daily update...");
    try {
        const indicators = await bcbService_1.bcbService.getLatestIndicators();
        // Save to 'latest' document for easy access
        await firebase_1.db.collection("market_indicators").doc("latest").set(indicators);
        // Update Market News
        await newsService_1.newsService.fetchMarketNews();
        // Optional: Store history with date as ID if needed for charts later
        // const today = new Date().toISOString().split("T")[0];
        // await db.collection("market_history").doc(today).set(indicators);
        logger_1.logger.info("Market Updater: Successfully updated indicators.", indicators);
    }
    catch (error) {
        logger_1.logger.error("Market Updater: Failed to update indicators", { error: error.message });
    }
});
