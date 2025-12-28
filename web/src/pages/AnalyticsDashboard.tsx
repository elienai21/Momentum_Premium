import React, { useEffect, useRef, useState } from "react";
import { AIAdvisorPanel } from "../components/AIAdvisorPanel";
import {
  Chart,
  LineElement,
  PointElement,
  LineController,
  CategoryScale,
  LinearScale,
  ArcElement,
  Tooltip,
  Legend,
  PieController,
  DoughnutController,
} from "chart.js";
import { useThemeWatcher } from "../hooks/useThemeWatcher";
import api from "../services/api";
import { useNavigate } from "react-router-dom";
import { useToast } from "../components/Toast";
import { SectionHeader } from "../components/ui/SectionHeader";
import { GlassPanel } from "../components/ui/GlassPanel";
import { StatsCard } from "../components/ui/StatsCard";
import { AsyncPanel } from "../components/ui/AsyncPanel";
import { InsightCard } from "../components/ui/InsightCard";
import { Wallet, TrendingUp, TrendingDown, PieChart, LineChart as LineChartIcon, Sparkles, RefreshCw } from "lucide-react";
import { cn } from "../lib/utils";

Chart.register(
  LineElement,
  PointElement,
  LineController,
  CategoryScale,
  LinearScale,
  ArcElement,
  Tooltip,
  Legend,
  PieController,
  DoughnutController,
);

type KPI = {
  balance: number;
  income: number;
  expense: number;
  balanceTrend?: string;
  incomeTrend?: string;
  expenseTrend?: string;
};

type Charts = {
  months: string[];
  incomeSeries: number[];
  expenseSeries: number[];
  categories: { category: string; amount: number }[];
};

type Meta = { categories: string[]; cards: string[] };
type ForecastResp = { kpis: KPI; charts: Charts; meta?: Meta };

export const AnalyticsDashboard: React.FC = () => {
  const theme = useThemeWatcher();
  const isDark = theme === "dark";
  const navigate = useNavigate();
  const { notify } = useToast();

  const [kpis, setKpis] = useState<KPI>({ balance: 0, income: 0, expense: 0 });
  const [meta, setMeta] = useState<Meta>({ categories: [], cards: [] });
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [hasData, setHasData] = useState<boolean>(false);

  const lineRef = useRef<HTMLCanvasElement | null>(null);
  const pieRef = useRef<HTMLCanvasElement | null>(null);
  const lineChart = useRef<Chart | null>(null);
  const pieChart = useRef<Chart | null>(null);

  const css = getComputedStyle(document.documentElement);
  const chartColors = [
    css.getPropertyValue("--chart-1").trim() || "#10b981",
    css.getPropertyValue("--chart-2").trim() || "#f43f5e",
    css.getPropertyValue("--chart-3").trim() || "#8b5cf6",
    css.getPropertyValue("--chart-4").trim() || "#f59e0b",
    css.getPropertyValue("--chart-5").trim() || "#3b82f6",
  ];
  const labelColor = isDark ? "#94a3b8" : "#64748b";

  async function loadAll() {
    setLoading(true);
    try {
      const forecastResp = await api.get<ForecastResp>("/portal/forecast");
      const forecast = forecastResp.data;

      const safeKpis = forecast?.kpis || { balance: 0, income: 0, expense: 0 };
      setKpis(safeKpis);
      setMeta(forecast?.meta || { categories: [], cards: [] });

      const charts: Charts = forecast?.charts || { months: [], incomeSeries: [], expenseSeries: [], categories: [] };
      renderCharts(charts);

      const hasKpis = (safeKpis.balance || 0) !== 0 || (safeKpis.income || 0) !== 0 || (safeKpis.expense || 0) !== 0;
      const hasCharts = (charts.months?.length || 0) > 0 || (charts.categories?.length || 0) > 0;
      setHasData(hasKpis || hasCharts);
    } catch (e) {
      console.error("Analytics Load Error:", e);
      setHasData(false);
    } finally {
      setLoading(false);
    }
  }

  async function loadInsights() {
    try {
      const { data } = await api.get<string[]>("/portal/insights/cache").catch(() => ({ data: [] as string[] }));
      setInsights(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
  }

  function renderCharts(ch: Charts) {
    const ctx1 = lineRef.current?.getContext("2d");
    const ctx2 = pieRef.current?.getContext("2d");
    if (!ctx1 || !ctx2) return;

    lineChart.current?.destroy();
    pieChart.current?.destroy();

    lineChart.current = new Chart(ctx1, {
      type: "line",
      data: {
        labels: ch.months,
        datasets: [
          {
            label: "Receitas",
            data: ch.incomeSeries,
            borderColor: chartColors[0],
            backgroundColor: isDark ? "rgba(16, 185, 129, 0.1)" : "rgba(16, 185, 129, 0.05)",
            borderWidth: 2,
            tension: 0.4,
            fill: true,
          },
          {
            label: "Despesas",
            data: ch.expenseSeries,
            borderColor: chartColors[1],
            backgroundColor: "transparent",
            borderWidth: 2,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'top', align: 'end', labels: { color: labelColor, boxWidth: 10, usePointStyle: true, font: { size: 10, weight: 'bold' } } },
          tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.9)', padding: 12, cornerRadius: 8 },
        },
        scales: {
          y: { grid: { color: "rgba(226, 232, 240, 0.05)" }, ticks: { color: labelColor, font: { size: 10 } } },
          x: { grid: { display: false }, ticks: { color: labelColor, font: { size: 10 } } },
        },
      },
    });

    pieChart.current = new Chart(ctx2, {
      type: "doughnut",
      data: {
        labels: ch.categories.map((c) => c.category),
        datasets: [{ data: ch.categories.map((c) => c.amount), backgroundColor: chartColors, borderColor: "transparent", hoverOffset: 4 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom", labels: { color: labelColor, usePointStyle: true, pointStyle: "circle", font: { size: 10 } } },
        },
        cutout: "70%",
      },
    });
  }

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { if (!loading) void loadInsights(); }, [loading]);

  return (
    <div className="space-y-8 pb-20 fade-in">
      <SectionHeader
        title={
          <div className="flex items-center gap-2">
            <TrendingUp size={24} className="text-momentum-accent" />
            <span>Analytics Financeiro</span>
          </div>
        }
        subtitle="Visão estratégica de fluxos, categorias e saúde do negócio."
        actions={
          <button onClick={loadAll} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-momentum-border hover:bg-white transition-all text-xs font-bold text-momentum-muted hover:text-momentum-text">
            <RefreshCw size={14} className={cn(loading && "animate-spin")} />
            Sincronizar
          </button>
        }
      />

      <div className="grid gap-8 md:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          <AsyncPanel isLoading={loading} isEmpty={!hasData} emptyTitle="Sem Dados" emptyDescription="Conecte suas finanças para gerar insights." onRetry={loadAll}>
            <div className="space-y-8">
              {/* KPIs Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 font-bold">
                <StatsCard
                  label="Saldo Projetado"
                  value={kpis.balance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  icon={Wallet}
                  trend={kpis.balanceTrend ? { value: kpis.balanceTrend, direction: kpis.balanceTrend.includes("+") ? "up" : "down" } : undefined}
                />
                <StatsCard
                  label="Receita Mensal"
                  value={kpis.income.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  variant="success"
                  icon={TrendingUp}
                />
                <StatsCard
                  label="Despesa Mensal"
                  value={kpis.expense.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  variant="danger"
                  icon={TrendingDown}
                />
              </div>

              {/* Charts Grid */}
              <div className="grid md:grid-cols-2 gap-8">
                <GlassPanel className="p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <LineChartIcon size={18} className="text-momentum-accent" />
                    <h3 className="text-sm font-bold text-momentum-text uppercase tracking-widest">Tendência (6 Meses)</h3>
                  </div>
                  <div className="h-[280px]">
                    <canvas ref={lineRef} />
                  </div>
                </GlassPanel>

                <GlassPanel className="p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <PieChart size={18} className="text-momentum-accent" />
                    <h3 className="text-sm font-bold text-momentum-text uppercase tracking-widest">Categorias</h3>
                  </div>
                  <div className="h-[280px]">
                    <canvas ref={pieRef} />
                  </div>
                </GlassPanel>
              </div>

              {/* Insights Section */}
              <GlassPanel className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Sparkles size={18} className="text-momentum-accent" />
                    <h3 className="text-sm font-bold text-momentum-text uppercase tracking-widest">Insights Estratégicos</h3>
                  </div>
                  <button onClick={loadInsights} className="text-[10px] font-bold text-momentum-accent uppercase hover:underline">Atualizar IA</button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {insights.length ? (
                    insights.map((text, i) => (
                      <InsightCard
                        key={i}
                        title="Análise Relevante"
                        description={text}
                        severity="info"
                      />
                    ))
                  ) : (
                    <div className="col-span-full py-8 text-center text-sm text-momentum-muted italic border-2 border-dashed border-momentum-border rounded-2xl">
                      Nenhum insight disponível no momento.
                    </div>
                  )}
                </div>
              </GlassPanel>
            </div>
          </AsyncPanel>
        </div>

        {/* Sidebar AI Advisor */}
        <div className="hidden md:block">
          <GlassPanel className="p-0 overflow-hidden sticky top-8 border-none shadow-2xl">
            <AIAdvisorPanel />
          </GlassPanel>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
