// web/src/pages/AnalyticsDashboard.tsx
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
    css.getPropertyValue("--chart-1").trim(),
    css.getPropertyValue("--chart-2").trim(),
    css.getPropertyValue("--chart-3").trim(),
    css.getPropertyValue("--chart-4").trim(),
    css.getPropertyValue("--chart-5").trim(),
  ];
  const labelColor = isDark ? "#e5e7eb" : "#0b0f17";

  async function loadAll() {
    setLoading(true);
    try {
      const forecastResp = await api.get<ForecastResp>("/portal/forecast");
      const forecast = forecastResp.data;

      const safeKpis = forecast?.kpis || { balance: 0, income: 0, expense: 0 };
      setKpis(safeKpis);
      setMeta(forecast?.meta || { categories: [], cards: [] });

      const charts: Charts =
        forecast?.charts || {
          months: [],
          incomeSeries: [],
          expenseSeries: [],
          categories: [],
        };

      renderCharts(charts);

      const hasKpis =
        (safeKpis.balance || 0) !== 0 ||
        (safeKpis.income || 0) !== 0 ||
        (safeKpis.expense || 0) !== 0;

      const hasCharts =
        (charts.months?.length || 0) > 0 ||
        (charts.categories?.length || 0) > 0;

      setHasData(hasKpis || hasCharts);
    } catch (e) {
      console.error("Erro ao carregar Analytics:", e);
      setHasData(false);
    } finally {
      setLoading(false);
    }
  }

  async function loadInsights() {
    try {
      const { data } = await api
        .get<string[]>("/portal/insights/cache")
        .catch(() => ({ data: [] as string[] }));
      setInsights(Array.isArray(data) ? data : []);
    } catch {
      /* ignora erro de insights */
    }
  }

  function renderCharts(ch: Charts) {
    const ctx1 = lineRef.current?.getContext("2d") as CanvasRenderingContext2D | null;
    const ctx2 = pieRef.current?.getContext("2d") as CanvasRenderingContext2D | null;
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
            backgroundColor: "transparent",
            borderWidth: 2,
            tension: 0.35,
            pointBackgroundColor: chartColors[0],
          },
          {
            label: "Despesas",
            data: ch.expenseSeries,
            borderColor: chartColors[1],
            backgroundColor: "transparent",
            borderWidth: 2,
            tension: 0.35,
            pointBackgroundColor: chartColors[1],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            labels: { color: labelColor },
          },
        },
        scales: {
          y: {
            grid: {
              color: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
            },
            ticks: { color: labelColor },
          },
          x: {
            grid: { display: false },
            ticks: { color: labelColor },
          },
        },
      },
    });

    pieChart.current = new Chart(ctx2, {
      type: "doughnut",
      data: {
        labels: ch.categories.map((c) => c.category),
        datasets: [
          {
            data: ch.categories.map((c) => c.amount),
            backgroundColor: chartColors,
            borderColor: "transparent",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: labelColor,
              usePointStyle: true,
              pointStyle: "circle",
            },
          },
        },
        cutout: "62%",
      },
    });
  }

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!loading) void loadInsights();
  }, [loading]);

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_380px] animate-fade-in">
      <div className="space-y-4 transition-all duration-500">
        {!loading && !hasData ? (
          <section className="card p-6 flex flex-col gap-3 items-start">
            <h3 className="font-semibold text-lg">Comece conectando suas finanças 🚀</h3>
            <p className="text-sm text-[var(--text-2)] max-w-xl">
              Ainda não encontramos dados suficientes para montar seus gráficos e indicadores. Importe um extrato bancário ou
              conecte suas planilhas para ver o Analytics do Momentum em ação.
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              <button
                onClick={() => navigate("/imports")}
                className="btn primary hover:-translate-y-px transition-all duration-300"
              >
                Importar dados
              </button>
              <button
                onClick={loadAll}
                className="btn ghost hover:-translate-y-px transition-all duration-300"
              >
                Atualizar
              </button>
            </div>
            <p className="text-xs text-[var(--text-3)] mt-1">
              Dica: você pode usar a aba de Importações para subir extratos em CSV ou planilhas e deixar o Momentum cuidar do resto.
            </p>
          </section>
        ) : (
          <>
            <section className="grid md:grid-cols-2 gap-4">
              <div className="card p-4">
                <h3 className="font-semibold mb-3">Resumo</h3>
                <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))" }}>
                  <div className="glass rounded-xl p-4">
                    <div className="text-sm opacity-70">Saldo Atual</div>
                    <div className="text-2xl font-bold text-gradient">
                      {kpis.balance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </div>
                    <div className="text-sm text-[var(--ok)] mt-1">{kpis.balanceTrend || ""}</div>
                  </div>
                  <div className="glass rounded-xl p-4">
                    <div className="text-sm opacity-70">Receita Mensal</div>
                    <div className="text-2xl font-bold text-gradient">
                      {kpis.income.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </div>
                    <div className="text-sm text-[var(--ok)] mt-1">{kpis.incomeTrend || ""}</div>
                  </div>
                  <div className="glass rounded-xl p-4">
                    <div className="text-sm opacity-70">Despesa Mensal</div>
                    <div className="text-2xl font-bold text-gradient">
                      {kpis.expense.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </div>
                    <div className="text-sm text-[var(--bad)] mt-1">{kpis.expenseTrend || ""}</div>
                  </div>
                </div>
              </div>

              <div className="card p-4">
                <h3 className="font-semibold mb-3">⚡ Insights Rápidos</h3>
                <div className="space-y-2 min-h-[60px]">
                  {insights.length ? insights.map((t, i) => <div key={i}>{t}</div>) : <em className="opacity-70">Sem insights no cache.</em>}
                </div>
                <div className="mt-2">
                  <button onClick={loadInsights} className="btn neutral hover:-translate-y-px transition-all duration-300">
                    Atualizar
                  </button>
                </div>
              </div>
            </section>

            <section className="grid md:grid-cols-2 gap-4">
              <div className="card p-4">
                <h3 className="font-semibold mb-3">Tendência (6M)</h3>
                <div className="h-[280px]">
                  <canvas ref={lineRef} />
                </div>
              </div>
              <div className="card p-4">
                <h3 className="font-semibold mb-3">Despesas por Categoria</h3>
                <div className="h-[280px]">
                  <canvas ref={pieRef} />
                </div>
              </div>
            </section>
          </>
        )}
      </div>

      <div className="hidden md:block animate-fade-in-slow">
        <AIAdvisorPanel />
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
