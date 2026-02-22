import React, { useEffect, useState } from "react";
import { db } from "../services/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { SectionHeader } from "../components/ui/SectionHeader";
import { GlassPanel } from "../components/ui/GlassPanel";
import { StatsCard } from "../components/ui/StatsCard";
import { LineChart, Newspaper, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "../lib/utils";

interface Indicators {
    selic: number;
    ipca: number;
    igpm?: number;
    usd: number;
}

interface NewsItem {
    title: string;
    link: string;
    source?: string;
    pubDate: string;
}

interface DailyNews {
    summary: string;
    sentiment: "Otimista" | "Pessimista" | "Neutro";
    news: NewsItem[];
    date: string;
}

export const MarketNews: React.FC = () => {
    const [indicators, setIndicators] = useState<Indicators | null>(null);
    const [dailyNews, setDailyNews] = useState<DailyNews | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Listen to Indicators
        const unsubIndicators = onSnapshot(doc(db, "market_indicators", "latest"), (doc) => {
            if (doc.exists()) {
                setIndicators(doc.data() as Indicators);
            }
        });

        // Listen to News
        const unsubNews = onSnapshot(doc(db, "market_news", "latest"), (doc) => {
            if (doc.exists()) {
                setDailyNews(doc.data() as DailyNews);
            }
            setLoading(false);
        });

        return () => {
            unsubIndicators();
            unsubNews();
        };
    }, []);

    const getSentimentColor = (s?: string) => {
        if (s === "Otimista") return "text-emerald-500";
        if (s === "Pessimista") return "text-rose-500";
        return "text-slate-500";
    };

    const getSentimentIcon = (s?: string) => {
        if (s === "Otimista") return <TrendingUp className="w-5 h-5 text-emerald-500" />;
        if (s === "Pessimista") return <TrendingDown className="w-5 h-5 text-rose-500" />;
        return <Minus className="w-5 h-5 text-slate-500" />;
    };

    return (
        <div className="space-y-8 pb-20 fade-in pt-6">
            <SectionHeader
                title={
                    <div className="flex items-center gap-2">
                        <Newspaper size={24} className="text-momentum-accent" />
                        <span>Market Intelligence</span>
                    </div>
                }
                subtitle="Indicadores econômicos e curadoria de notícias via IA."
            />

            {/* Economic Indicators */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatsCard
                    label="Taxa Selic"
                    value={indicators ? `${indicators.selic}%` : "--"}
                    icon={LineChart}
                    variant="default"
                />
                <StatsCard
                    label="IPCA (12m)"
                    value={indicators ? `${indicators.ipca}%` : "--"}
                    icon={TrendingUp}
                    variant="default"
                />
                <StatsCard
                    label="Dólar (USD)"
                    value={indicators ? indicators.usd.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "--"}
                    icon={TrendingUp}
                    variant={indicators && indicators.usd > 5.5 ? "danger" : "default"}
                />
                <StatsCard
                    label="IGP-M"
                    value={indicators?.igpm ? `${indicators.igpm}%` : "--"}
                    icon={LineChart}
                    variant="default"
                />
            </div>

            {/* AI Daily Summary */}
            <GlassPanel className="p-8 border-l-4 border-l-momentum-accent">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">🤖</span>
                        <h3 className="text-lg font-bold text-momentum-text">Resumo do Mercado (IA)</h3>
                    </div>
                    <div className={cn("flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-sm", getSentimentColor(dailyNews?.sentiment))}>
                        {getSentimentIcon(dailyNews?.sentiment)}
                        {dailyNews?.sentiment || "Aguardando Análise..."}
                    </div>
                </div>

                {loading ? (
                    <div className="space-y-2 animate-pulse">
                        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4"></div>
                        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full"></div>
                        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-2/3"></div>
                    </div>
                ) : (
                    <p className="text-momentum-muted leading-relaxed text-base">
                        {dailyNews?.summary || "Nenhum resumo disponível para hoje."}
                    </p>
                )}
            </GlassPanel>

            {/* News Feed */}
            <h3 className="text-lg font-bold text-momentum-text flex items-center gap-2">
                <span className="w-1.5 h-6 bg-momentum-accent rounded-full"></span>
                Manchetes do Dia
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
                {loading ? (
                    Array(4).fill(0).map((_, i) => (
                        <GlassPanel key={i} className="h-24 animate-pulse bg-slate-100/50"><div /></GlassPanel>
                    ))
                ) : (
                    dailyNews?.news?.map((item, i) => (
                        <GlassPanel key={i} className="p-5 hover:border-momentum-accent/50 transition-colors group">
                            <a href={item.link} target="_blank" rel="noopener noreferrer" className="block">
                                <span className="text-[10px] uppercase font-bold text-momentum-muted tracking-widest mb-1 block">
                                    {item.source} • {new Date(item.pubDate).toLocaleDateString()}
                                </span>
                                <h4 className="font-bold text-momentum-text group-hover:text-momentum-accent transition-colors line-clamp-2 mb-2">
                                    {item.title}
                                </h4>
                                <div className="flex items-center gap-1 text-xs text-momentum-accent font-bold uppercase tracking-wider">
                                    Ler matéria
                                    <TrendingUp size={12} />
                                </div>
                            </a>
                        </GlassPanel>
                    ))
                )}

                {!loading && (!dailyNews?.news || dailyNews.news.length === 0) && (
                    <div className="col-span-full py-12 text-center text-momentum-muted italic border-2 border-dashed border-momentum-border rounded-xl">
                        Nenhuma notícia encontrada.
                    </div>
                )}
            </div>
        </div>
    );
};

export default MarketNews;
