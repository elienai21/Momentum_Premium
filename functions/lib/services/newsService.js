"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.newsService = void 0;
const rss_parser_1 = __importDefault(require("rss-parser"));
const firebase_1 = require("./firebase");
const aiClient_1 = require("../utils/aiClient");
const logger_1 = require("../utils/logger");
const RSS_FEEDS = [
    // Query 1: Focada em REUTERS e INFO MONEY (Hard News Financeiro)
    "https://news.google.com/rss/search?q=site:reuters.com+OR+site:infomoney.com.br+when:1d&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    // Query 2: Focada em AGÊNCIA BRASIL (Regulatório/Governo Neutro)
    "https://news.google.com/rss/search?q=site:agenciabrasil.ebc.com.br+(economia+OR+mercado)&hl=pt-BR&gl=BR&ceid=BR:pt-419"
];
exports.newsService = {
    /**
     * Fetches news from curated RSS feeds, summarizes via AI, and saves to Firestore.
     */
    async fetchMarketNews() {
        logger_1.logger.info("Fetching market news from RSS feeds...");
        const parser = new rss_parser_1.default();
        const allNews = [];
        try {
            // Fetch all feeds in parallel
            const feedPromises = RSS_FEEDS.map(async (url) => {
                try {
                    const feed = await parser.parseURL(url);
                    return feed.items.map((item) => ({
                        title: item.title || "",
                        link: item.link || "",
                        pubDate: item.pubDate || new Date().toISOString(),
                        source: item.creator || item.source || "Google News",
                    }));
                }
                catch (err) {
                    logger_1.logger.warn(`Failed to fetch RSS feed provided: ${url}`, { error: err.message });
                    return [];
                }
            });
            const results = await Promise.all(feedPromises);
            results.forEach(items => allNews.push(...items));
            // Deduplicate by link or title to avoid potential overlaps if queries intersect
            const uniqueNews = Array.from(new Map(allNews.map(item => [item.link, item])).values());
            // Sort by date descending (newest first)
            uniqueNews.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
            // Take top 5
            const topNews = uniqueNews.slice(0, 5);
            if (topNews.length === 0) {
                logger_1.logger.warn("No news found from any feed.");
            }
            // Generate AI Summary
            const headlines = topNews.map((n) => `- ${n.title}`).join("\n");
            const prompt = `
        Analise estas 5 manchetes do mercado financeiro brasileiro:
        ${headlines}

        1. Gere um resumo executivo de 1 parágrafo sobre o sentimento do mercado para um pequeno empresário.
        2. Classifique o sentimento geral em uma única palavra: "Otimista", "Pessimista" ou "Neutro".
        
        Responda no formato JSON: { "summary": "...", "sentiment": "..." }
      `;
            let aiResult = { summary: "Resumo indisponível.", sentiment: "Neutro" };
            try {
                const aiResponse = await (0, aiClient_1.aiClient)(prompt, {
                    tenantId: "system",
                    userId: "market-agent",
                    model: "gemini",
                    promptKind: "market_news",
                });
                if (aiResponse && aiResponse.text) {
                    const parsed = JSON.parse(aiResponse.text);
                    aiResult.summary = parsed.summary || aiResult.summary;
                    aiResult.sentiment = parsed.sentiment || "Neutro";
                }
            }
            catch (err) {
                logger_1.logger.error("AI summarization failed", { error: err.message });
                aiResult.summary = "Não foi possível gerar análise de IA hoje.";
            }
            const dailyUpdate = {
                date: new Date().toISOString().split("T")[0],
                summary: aiResult.summary,
                sentiment: aiResult.sentiment,
                news: topNews,
                updatedAt: new Date().toISOString(),
            };
            // Save to 'market_news/daily' (overwriting for 'daily' view, or appending to a history collection)
            // Requirements say: "Salve o resumo e os links das notícias no Firestore (market_news/daily)"
            // I will save to doc 'latest' for the dashboard and also key by date if needed, but 'daily' implies the daily report.
            // I'll use 'latest' doc for easy frontend access, similar to indicators.
            await firebase_1.db.collection("market_news").doc("latest").set(dailyUpdate);
            logger_1.logger.info("Market news updated successfully", dailyUpdate);
            return dailyUpdate;
        }
        catch (error) {
            logger_1.logger.error("Failed to fetch market news", { error: error.message });
            throw error;
        }
    },
};
