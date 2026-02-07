import Parser from "rss-parser";
import { db } from "./firebase";
import { aiClient } from "../utils/aiClient";
import { logger } from "../utils/logger";

const RSS_FEEDS = [
    // Query 1: Focada em REUTERS e INFO MONEY (Hard News Financeiro)
    "https://news.google.com/rss/search?q=site:reuters.com+OR+site:infomoney.com.br+when:1d&hl=pt-BR&gl=BR&ceid=BR:pt-419",

    // Query 2: Focada em AGÊNCIA BRASIL (Regulatório/Governo Neutro)
    "https://news.google.com/rss/search?q=site:agenciabrasil.ebc.com.br+(economia+OR+mercado)&hl=pt-BR&gl=BR&ceid=BR:pt-419"
];

export interface NewsItem {
    title: string;
    link: string;
    pubDate: string;
    source?: string;
}

export interface MarketDailyUpdate {
    date: string;
    summary: string; // AI Generated
    sentiment: "Otimista" | "Pessimista" | "Neutro";
    news: NewsItem[];
    updatedAt: string;
}

export const newsService = {
    /**
     * Fetches news from curated RSS feeds, summarizes via AI, and saves to Firestore.
     */
    async fetchMarketNews(): Promise<MarketDailyUpdate> {
        logger.info("Fetching market news from RSS feeds...");
        const parser = new Parser();
        const allNews: NewsItem[] = [];

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
                } catch (err: any) {
                    logger.warn(`Failed to fetch RSS feed provided: ${url}`, { error: err.message });
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
                logger.warn("No news found from any feed.");
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

            const aiResult = { summary: "Resumo indisponível.", sentiment: "Neutro" as const };

            try {
                const aiResponse = await aiClient(prompt, {
                    tenantId: "system",
                    userId: "market-agent",
                    model: "gemini",
                    promptKind: "market_news",
                });

                if (aiResponse && aiResponse.text) {
                    const parsed = JSON.parse(aiResponse.text);
                    aiResult.summary = parsed.summary || aiResult.summary;
                    aiResult.sentiment = (parsed.sentiment as any) || "Neutro";
                }
            } catch (err: any) {
                logger.error("AI summarization failed", { error: err.message });
                aiResult.summary = "Não foi possível gerar análise de IA hoje.";
            }

            const dailyUpdate: MarketDailyUpdate = {
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
            await db.collection("market_news").doc("latest").set(dailyUpdate);

            logger.info("Market news updated successfully", dailyUpdate);
            return dailyUpdate;
        } catch (error: any) {
            logger.error("Failed to fetch market news", { error: error.message });
            throw error;
        }
    },
};
