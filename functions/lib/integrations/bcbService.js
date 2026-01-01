"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bcbService = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../utils/logger");
/**
 * Service to fetch economic indicators from BCB and external APIs.
 */
exports.bcbService = {
    /**
     * Fetches latest economic indicators.
     */
    async getLatestIndicators() {
        try {
            logger_1.logger.info("Fetching economic indicators...");
            const [selicRes, ipcaRes, igpmRes, usdRes] = await Promise.all([
                axios_1.default.get("https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados?ultimos=1"),
                axios_1.default.get("https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?ultimos=1"),
                axios_1.default.get("https://api.bcb.gov.br/dados/serie/bcdata.sgs.189/dados?ultimos=1"),
                axios_1.default.get("https://economia.awesomeapi.com.br/last/USD-BRL"),
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
            logger_1.logger.info("Economic indicators fetched successfully", indicators);
            return indicators;
        }
        catch (error) {
            logger_1.logger.error("Error fetching economic indicators (returning default 0s)", { error: error.message });
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
