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
  Filler,
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
  Filler,
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
  months: string[];              // Ex: ["Jan", "Fev", "Mar", "Abr (Proj)", "Mai (Proj)"]
  incomeSeries: (number | null)[];
  expenseSeries: (number | null)[];
  // Dados de Projeção
  forecastIncome: (number | null)[];
  forecastExpense: (number | null)[];
  // Intervalos de Confiança (O túnel de probabilidade)
  confidenceUpper: (number | null)[];
  confidenceLower: (number | null)[];
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

  // ============================================
  // HYBRID PROJECTION ENGINE (Cold Start Logic)
  // ============================================
  type ForecastResult = {
    forecastValues: (number | null)[];
    upper: (number | null)[];
    lower: (number | null)[];
    extendedMonths: string[];
  };

  function generateHybridForecast(
    historicalData: (number | null)[],
    months: string[],
    projectionMonths: number = 3
  ): ForecastResult {
    // Filter out nulls for calculations
    const validData = historicalData.filter((v): v is number => v !== null && v > 0);
    const dataCount = validData.length;

    // Determine confidence factor based on data availability
    let confidenceFactor: number;
    let growthRate: number;

    if (dataCount < 3) {
      // COLD START: Very few data points - use wide confidence band
      confidenceFactor = 0.40; // 40% variance
      growthRate = 0.02; // Conservative 2% assumed growth
    } else if (dataCount < 6) {
      // PARTIAL DATA: Use simple linear trend
      confidenceFactor = 0.25; // 25% variance
      const recentAvg = validData.slice(-3).reduce((a, b) => a + b, 0) / 3;
      const olderAvg = validData.slice(0, Math.min(3, validData.length)).reduce((a, b) => a + b, 0) / Math.min(3, validData.length);
      growthRate = olderAvg > 0 ? (recentAvg - olderAvg) / olderAvg / dataCount : 0.02;
    } else {
      // FULL DATA: Use weighted moving average with tighter confidence
      confidenceFactor = 0.15; // 15% variance
      const weights = [0.1, 0.15, 0.2, 0.25, 0.3];
      const recentData = validData.slice(-5);
      let weightedSum = 0;
      let totalWeight = 0;
      recentData.forEach((val, i) => {
        const weight = weights[i] || 0.3;
        weightedSum += val * weight;
        totalWeight += weight;
      });
      const weightedAvg = weightedSum / totalWeight;
      const previousAvg = validData.slice(-6, -3).reduce((a, b) => a + b, 0) / 3;
      growthRate = previousAvg > 0 ? (weightedAvg - previousAvg) / previousAvg / 3 : 0.01;
    }

    // Clamp growth rate to reasonable bounds
    growthRate = Math.max(-0.15, Math.min(0.15, growthRate));

    // Get base value for projections
    const baseValue = validData.length > 0
      ? validData.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, validData.length)
      : 5000; // Default for complete cold start

    // Build projection arrays
    const forecastValues: (number | null)[] = [...historicalData.map(() => null)];
    const upper: (number | null)[] = [...historicalData.map(() => null)];
    const lower: (number | null)[] = [...historicalData.map(() => null)];
    const extendedMonths = [...months];

    // Connect forecast to last real data point
    if (validData.length > 0) {
      const lastRealIndex = historicalData.length - 1;
      forecastValues[lastRealIndex] = validData[validData.length - 1];
      upper[lastRealIndex] = validData[validData.length - 1];
      lower[lastRealIndex] = validData[validData.length - 1];
    }

    // Generate projections
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const currentMonthIndex = months.length > 0 ? monthNames.indexOf(months[months.length - 1]?.substring(0, 3)) : new Date().getMonth();

    for (let i = 1; i <= projectionMonths; i++) {
      const projectedValue = baseValue * Math.pow(1 + growthRate, i);
      const variance = projectedValue * confidenceFactor * (1 + i * 0.1); // Variance increases over time

      forecastValues.push(Math.round(projectedValue));
      upper.push(Math.round(projectedValue + variance));
      lower.push(Math.round(Math.max(0, projectedValue - variance)));

      const nextMonthIndex = (currentMonthIndex + i) % 12;
      extendedMonths.push(`${monthNames[nextMonthIndex]} (Proj)`);
    }

    return { forecastValues, upper, lower, extendedMonths };
  }

  // ============================================
  // DATA LOADING
  // ============================================
  async function loadAll() {
    setLoading(true);
    try {
      const forecastResp = await api.get<ForecastResp>("/portal/forecast");
      const forecast = forecastResp.data;

      const safeKpis = forecast?.kpis || { balance: 0, income: 0, expense: 0 };
      setKpis(safeKpis);
      setMeta(forecast?.meta || { categories: [], cards: [] });

      // Get raw charts or default empty structure
      const rawCharts = forecast?.charts || {
        months: [],
        incomeSeries: [],
        expenseSeries: [],
        forecastIncome: [],
        forecastExpense: [],
        confidenceUpper: [],
        confidenceLower: [],
        categories: []
      };

      // Apply hybrid projection engine if backend didn't provide forecasts
      let charts: Charts;
      if (!rawCharts.forecastIncome || rawCharts.forecastIncome.length === 0) {
        const incomeProj = generateHybridForecast(rawCharts.incomeSeries, rawCharts.months, 3);
        const expenseProj = generateHybridForecast(rawCharts.expenseSeries, rawCharts.months, 3);

        charts = {
          ...rawCharts,
          months: incomeProj.extendedMonths,
          incomeSeries: [...rawCharts.incomeSeries, ...Array(3).fill(null)],
          expenseSeries: [...rawCharts.expenseSeries, ...Array(3).fill(null)],
          forecastIncome: incomeProj.forecastValues,
          forecastExpense: expenseProj.forecastValues,
          confidenceUpper: incomeProj.upper,
          confidenceLower: incomeProj.lower,
        };
      } else {
        charts = rawCharts;
      }

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

  // ============================================
  // CHART RENDERING WITH FORECAST VISUALIZATION
  // ============================================
  function renderCharts(ch: Charts) {
    const ctx1 = lineRef.current?.getContext("2d");
    const ctx2 = pieRef.current?.getContext("2d");
    if (!ctx1 || !ctx2) return;

    lineChart.current?.destroy();
    pieChart.current?.destroy();

    // Create gradient for confidence tunnel
    const tunnelGradient = ctx1.createLinearGradient(0, 0, 0, 280);
    tunnelGradient.addColorStop(0, isDark ? "rgba(139, 92, 246, 0.15)" : "rgba(139, 92, 246, 0.1)");
    tunnelGradient.addColorStop(1, "rgba(139, 92, 246, 0)");

    lineChart.current = new Chart(ctx1, {
      type: "line",
      data: {
        labels: ch.months,
        datasets: [
          // Confidence Upper Bound (invisible line, just for fill)
          {
            label: "Limite Superior",
            data: ch.confidenceUpper,
            borderColor: "transparent",
            backgroundColor: tunnelGradient,
            fill: "+1", // Fill to next dataset (lower bound)
            pointRadius: 0,
            tension: 0.4,
            order: 3,
          },
          // Confidence Lower Bound
          {
            label: "Limite Inferior",
            data: ch.confidenceLower,
            borderColor: "transparent",
            backgroundColor: "transparent",
            fill: false,
            pointRadius: 0,
            tension: 0.4,
            order: 4,
          },
          // Historical Income (solid line)
          {
            label: "Receitas",
            data: ch.incomeSeries,
            borderColor: chartColors[0],
            backgroundColor: isDark ? "rgba(16, 185, 129, 0.1)" : "rgba(16, 185, 129, 0.05)",
            borderWidth: 2.5,
            tension: 0.4,
            fill: true,
            pointRadius: 4,
            pointBackgroundColor: chartColors[0],
            order: 1,
          },
          // Historical Expense (solid line)
          {
            label: "Despesas",
            data: ch.expenseSeries,
            borderColor: chartColors[1],
            backgroundColor: "transparent",
            borderWidth: 2.5,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: chartColors[1],
            order: 2,
          },
          // Forecast Income (dashed line)
          {
            label: "Receitas (Proj)",
            data: ch.forecastIncome,
            borderColor: chartColors[0],
            backgroundColor: "transparent",
            borderWidth: 2,
            borderDash: [6, 4],
            tension: 0.4,
            pointRadius: 3,
            pointStyle: "circle",
            pointBackgroundColor: isDark ? "#1e293b" : "#ffffff",
            pointBorderColor: chartColors[0],
            pointBorderWidth: 2,
            order: 1,
          },
          // Forecast Expense (dashed line)
          {
            label: "Despesas (Proj)",
            data: ch.forecastExpense,
            borderColor: chartColors[1],
            backgroundColor: "transparent",
            borderWidth: 2,
            borderDash: [6, 4],
            tension: 0.4,
            pointRadius: 3,
            pointStyle: "circle",
            pointBackgroundColor: isDark ? "#1e293b" : "#ffffff",
            pointBorderColor: chartColors[1],
            pointBorderWidth: 2,
            order: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            align: 'end',
            labels: {
              color: labelColor,
              boxWidth: 12,
              usePointStyle: true,
              font: { size: 10, weight: 'bold' },
              filter: (legendItem) => {
                // Hide confidence bounds from legend
                return !legendItem.text?.includes("Limite");
              },
            }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            padding: 14,
            cornerRadius: 10,
            titleFont: { size: 12, weight: 'bold' },
            bodyFont: { size: 11 },
            callbacks: {
              label: (context) => {
                const value = context.raw as number;
                if (value === null) return '';
                const formatted = value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
                const isProjection = context.dataset.label?.includes("Proj");
                return `${context.dataset.label}: ${formatted}${isProjection ? " ⚡" : ""}`;
              }
            }
          },
        },
        scales: {
          y: {
            grid: { color: isDark ? "rgba(226, 232, 240, 0.05)" : "rgba(0, 0, 0, 0.05)" },
            ticks: {
              color: labelColor,
              font: { size: 10 },
              callback: (value) => `R$ ${(Number(value) / 1000).toFixed(0)}k`
            }
          },
          x: {
            grid: { display: false },
            ticks: {
              color: labelColor,
              font: { size: 10, weight: 'bold' },
              callback: function (val, index) {
                const label = ch.months[index];
                return label?.includes("(Proj)") ? `📈 ${label.replace(" (Proj)", "")}` : label;
              }
            }
          },
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
