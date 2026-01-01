import { onSchedule } from "firebase-functions/v2/scheduler";
import { db } from "../services/firebase";
import { logger } from "../utils/logger";
import { bcbService } from "../integrations/bcbService";
import { newsService } from "../services/newsService";

/**
 * Market Updater Job
 * 
 * Runs daily at 08:00 AM to fetch latest economic indicators (Selic, IPCA, USD)
 * and update the 'latest' document in 'market_indicators' collection.
 */
export const marketUpdater = onSchedule(
    {
        schedule: "0 8 * * *", // 08:00 AM daily
        timeZone: "America/Sao_Paulo",
        region: "southamerica-east1",
        timeoutSeconds: 300,
        memory: "256MiB",
    },
    async (event) => {
        logger.info("Market Updater: Starting daily update...");
        try {
            const indicators = await bcbService.getLatestIndicators();

            // Save to 'latest' document for easy access
            await db.collection("market_indicators").doc("latest").set(indicators);

            // Update Market News
            await newsService.fetchMarketNews();

            // Optional: Store history with date as ID if needed for charts later
            // const today = new Date().toISOString().split("T")[0];
            // await db.collection("market_history").doc(today).set(indicators);

            logger.info("Market Updater: Successfully updated indicators.", indicators);
        } catch (error: any) {
            logger.error("Market Updater: Failed to update indicators", { error: error.message });
        }
    }
);
