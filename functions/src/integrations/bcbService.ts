import axios from "axios";
import { logger } from "../utils/logger";

interface BCBData {
    data: string;
    valor: string;
}

export interface EconomicIndicators {
    selic: number;
    ipca: number;
    igpm: number;
    usd: number;
    updatedAt: string;
}

/**
 * Service to fetch economic indicators from BCB and external APIs.
 */
export const bcbService = {
    /**
     * Fetches latest economic indicators.
     */
    async getLatestIndicators(): Promise<EconomicIndicators> {
        try {
            logger.info("Fetching economic indicators...");

            const [selicRes, ipcaRes, igpmRes, usdRes] = await Promise.all([
                axios.get<BCBData[]>("https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados?ultimos=1"),
                axios.get<BCBData[]>("https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?ultimos=1"),
                axios.get<BCBData[]>("https://api.bcb.gov.br/dados/serie/bcdata.sgs.189/dados?ultimos=1"),
                axios.get<any>("https://economia.awesomeapi.com.br/last/USD-BRL"),
            ]);

            const selic = parseFloat(selicRes.data[0]?.valor || "0");
            const ipca = parseFloat(ipcaRes.data[0]?.valor || "0");
            const igpm = parseFloat(igpmRes.data[0]?.valor || "0");
            const usd = parseFloat(usdRes.data.USDBRL?.bid || "0");

            const indicators = {
                selic,
                ipca,
                igpm,
                usd,
                updatedAt: new Date().toISOString(),
            };

            logger.info("Economic indicators fetched successfully", indicators);
            return indicators;
        } catch (error: any) {
            logger.error("Error fetching economic indicators (returning default 0s)", { error: error.message });

            // Return zeroed data on failure to ensure system robustness
            return {
                selic: 0,
                ipca: 0,
                igpm: 0,
                usd: 0,
                updatedAt: new Date().toISOString(),
            };
        }
    },
};
