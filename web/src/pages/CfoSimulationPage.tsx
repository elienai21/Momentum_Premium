import React, { useState, useRef, useEffect } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Chart } from "chart.js";
import { Loader2, TrendingUp, AlertTriangle, Calculator, RefreshCw } from "lucide-react";
import { CfoApi, AdvancedSimulationResponse } from "../services/CfoApi";
import { UpgradeRequiredModal } from "../components/UpgradeRequiredModal";
import { SectionHeader } from "../components/ui/SectionHeader";
import { GlassPanel } from "../components/ui/GlassPanel";
import { StatsCard } from "../components/ui/StatsCard";
import { Badge } from "../components/ui/Badge";
import { AsyncPanel } from "../components/ui/AsyncPanel";
import { cn } from "../lib/utils";

// Registro de componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

const fmtMoney = (val: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(val);

export default function CfoSimulationPage() {
  const [activeTab, setActiveTab] = useState<"simple" | "advanced">("simple");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstance = useRef<Chart | null>(null);

  const [incDeltaPct, setIncDeltaPct] = useState(0);
  const [expDeltaPct, setExpDeltaPct] = useState(0);
  const [oneOffExpense, setOneOffExpense] = useState(0);

  const [advRecurringExp, setAdvRecurringExp] = useState(0);
  const [advGrowthRate, setAdvGrowthRate] = useState(0);
  const [advOneTimeExp, setAdvOneTimeExp] = useState(0);

  const [result, setResult] = useState<AdvancedSimulationResponse | null>(null);

  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeInfo, setUpgradeInfo] = useState<{
    feature?: string;
    plan?: string;
  } | null>(null);

  function handleUpgradeError(err: any, contexto: "simple" | "advanced") {
    const status = err?.status;
    const message: string = err?.message || "";

    if (status === 403 && message.startsWith("UPGRADE_REQUIRED")) {
      const parts = message.split(":");
      const featureKey = parts[1] || (contexto === "advanced" ? "cfo_simulator_advanced" : "cfo_simulator");
      const planName = parts[2];

      setUpgradeInfo({ feature: featureKey, plan: planName });
      setUpgradeOpen(true);
      setError(contexto === "advanced" ? "Cenário premium." : "Recurso premium.");
      return;
    }

    setError(message || "Erro na simulação.");
  }

  const handleSimulateSimple = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await CfoApi.simulate({ incDeltaPct, expDeltaPct, oneOffExpense });
      const simulatedProjection = resp.monthlyProjection || Array.from({ length: 6 }).map((_, i) => ({
        month: i + 1,
        balance: resp.result.net * (i + 1),
      }));

      setResult({
        ok: true,
        baseline: { avgIncome: resp.base.income, avgExpense: resp.base.expense, runwayMonths: 0 },
        projected: { avgIncome: resp.result.newIncome, avgExpense: resp.result.newExpense, runwayMonths: 0, netCashFlow: resp.result.net },
        deltas: { runwayImpact: 0, cashImpact: resp.result.net - (resp.base.income - resp.base.expense) },
        monthlyProjection: simulatedProjection,
      });
    } catch (err: any) {
      handleUpgradeError(err, "simple");
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateAdvanced = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await CfoApi.simulateAdvanced({
        recurringExpensesDelta: advRecurringExp,
        growthRateIncome: advGrowthRate / 100,
        oneTimeExpense: advOneTimeExp,
      });
      setResult(resp);
    } catch (err: any) {
      handleUpgradeError(err, "advanced");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!chartRef.current || !result) return;
    chartInstance.current?.destroy();
    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;

    chartInstance.current = new Chart(ctx, {
      type: "line",
      data: chartData as any,
      options: chartOptions as any,
    });

    return () => chartInstance.current?.destroy();
  }, [result]);

  const chartData = {
    labels: ["Mês 1", "Mês 2", "Mês 3", "Mês 4", "Mês 5", "Mês 6"],
    datasets: [
      {
        label: "Saldo Projetado",
        data: result?.monthlyProjection?.map((p) => p.balance) || [],
        borderColor: "rgb(16, 185, 129)",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleFont: { size: 12 },
        bodyFont: { size: 12 },
        padding: 12,
        cornerRadius: 8,
      }
    },
    scales: {
      y: {
        grid: { color: "rgba(226, 232, 240, 0.1)" },
        ticks: { color: "#94a3b8", font: { size: 10 } },
      },
      x: {
        grid: { display: false },
        ticks: { color: "#94a3b8", font: { size: 10 } },
      },
    },
  };

  return (
    <>
      <div className="space-y-8 pb-20 fade-in">
        <SectionHeader
          title={
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-momentum-accent" />
              <span>Simulador CFO</span>
            </div>
          }
          subtitle="Projete cenários e analise o impacto no runway e fluxo de caixa."
          actions={
            <div className="flex bg-white/50 dark:bg-slate-900/50 p-1 rounded-xl border border-momentum-border backdrop-blur-sm">
              <button
                onClick={() => { setActiveTab("simple"); setError(null); }}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all",
                  activeTab === "simple" ? "bg-momentum-accent text-white shadow-sm" : "text-momentum-muted hover:text-momentum-text"
                )}
              >
                Rápido
              </button>
              <button
                onClick={() => { setActiveTab("advanced"); setError(null); }}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all",
                  activeTab === "advanced" ? "bg-momentum-accent text-white shadow-sm" : "text-momentum-muted hover:text-momentum-text"
                )}
              >
                Avançado
              </button>
            </div>
          }
        />

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <GlassPanel className="p-6">
              <h3 className="text-sm font-bold text-momentum-text uppercase tracking-widest mb-6">Parâmetros do Cenário</h3>

              {activeTab === "simple" ? (
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-[10px] font-bold text-momentum-muted uppercase tracking-wider">Variação Receita</label>
                      <span className={cn("text-xs font-bold", incDeltaPct >= 0 ? "text-momentum-success" : "text-momentum-danger")}>
                        {incDeltaPct > 0 ? "+" : ""}{incDeltaPct}%
                      </span>
                    </div>
                    <input
                      type="range" min="-50" max="50" step="5" value={incDeltaPct}
                      onChange={(e) => setIncDeltaPct(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-momentum-accent"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-[10px] font-bold text-momentum-muted uppercase tracking-wider">Variação Despesas</label>
                      <span className={cn("text-xs font-bold", expDeltaPct <= 0 ? "text-momentum-success" : "text-momentum-danger")}>
                        {expDeltaPct > 0 ? "+" : ""}{expDeltaPct}%
                      </span>
                    </div>
                    <input
                      type="range" min="-50" max="50" step="5" value={expDeltaPct}
                      onChange={(e) => setExpDeltaPct(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-momentum-muted uppercase tracking-wider block mb-2">Gasto Extra (BRL)</label>
                    <input
                      type="number" value={oneOffExpense} onChange={(e) => setOneOffExpense(Number(e.target.value))}
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-momentum-border rounded-xl px-4 py-2.5 text-sm transition-all focus:ring-2 focus:ring-momentum-accent/20"
                      placeholder="Ex: 5000"
                    />
                  </div>

                  <button
                    onClick={handleSimulateSimple} disabled={loading}
                    className="w-full py-3 bg-momentum-accent text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-momentum-accent/90 disabled:opacity-50 transition-all flex justify-center items-center gap-2 shadow-momentum-glow"
                  >
                    {loading ? <RefreshCw className="animate-spin h-4 w-4" /> : "Simular Agora"}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-bold text-momentum-muted uppercase tracking-wider block mb-2">Custo Recorrente (BRL/mês)</label>
                    <input
                      type="number" value={advRecurringExp} onChange={(e) => setAdvRecurringExp(Number(e.target.value))}
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-momentum-border rounded-xl px-4 py-2.5 text-sm transition-all focus:ring-2 focus:ring-momentum-accent/20"
                      placeholder="Ex: 2500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-momentum-muted uppercase tracking-wider block mb-2">Crescimento Receita (% mensal)</label>
                    <input
                      type="number" value={advGrowthRate} onChange={(e) => setAdvGrowthRate(Number(e.target.value))}
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-momentum-border rounded-xl px-4 py-2.5 text-sm transition-all focus:ring-2 focus:ring-momentum-accent/20"
                      placeholder="Ex: 10"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-momentum-muted uppercase tracking-wider block mb-2">Capex/Investimento (BRL)</label>
                    <input
                      type="number" value={advOneTimeExp} onChange={(e) => setAdvOneTimeExp(Number(e.target.value))}
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-momentum-border rounded-xl px-4 py-2.5 text-sm transition-all focus:ring-2 focus:ring-momentum-accent/20"
                      placeholder="Ex: 15000"
                    />
                  </div>

                  <button
                    onClick={handleSimulateAdvanced} disabled={loading}
                    className="w-full py-3 bg-momentum-accent text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-momentum-accent/90 disabled:opacity-50 transition-all flex justify-center items-center gap-2 shadow-momentum-glow"
                  >
                    {loading ? <RefreshCw className="animate-spin h-4 w-4" /> : "Projetar Impacto"}
                  </button>
                </div>
              )}

              {error && (
                <div className="mt-6 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-500/20 rounded-xl flex items-start gap-3">
                  <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                  <span className="text-xs text-rose-700 dark:text-rose-300 font-medium">{error}</span>
                </div>
              )}
            </GlassPanel>
          </div>

          <div className="lg:col-span-2 space-y-8">
            <AsyncPanel
              isLoading={loading}
              isEmpty={!result}
              emptyTitle="Pronto para Simular"
              emptyDescription="Ajuste os parâmetros ao lado para visualizar o impacto financeiro futuro."
              emptyIcon={<TrendingUp className="opacity-40" />}
              className="border-none bg-transparent shadow-none"
            >
              {result && (
                <div className="space-y-8">
                  <div className="grid sm:grid-cols-3 gap-6">
                    <StatsCard
                      label="Runway Projetado"
                      value={`${result.projected.runwayMonths.toFixed(1)} meses`}
                      icon={TrendingUp}
                      variant={result.projected.runwayMonths < 3 ? "danger" : "success"}
                      trend={{
                        value: `${result.deltas.runwayImpact >= 0 ? "+" : ""}${result.deltas.runwayImpact.toFixed(1)} meses`,
                        direction: result.deltas.runwayImpact >= 0 ? "up" : "down"
                      }}
                    />
                    <StatsCard
                      label="Margem Líquida Proj."
                      value={fmtMoney(result.projected.netCashFlow)}
                      icon={RefreshCw}
                      variant={result.projected.netCashFlow >= 0 ? "success" : "danger"}
                    />
                    <StatsCard
                      label="Novo Burn Rate"
                      value={fmtMoney(result.projected.avgExpense)}
                      icon={AlertTriangle}
                    />
                  </div>

                  <GlassPanel className="p-6">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-sm font-bold text-momentum-text uppercase tracking-widest">Saldo Acumulado (6 Meses)</h3>
                      <Badge variant="success">Simulação Ativa</Badge>
                    </div>
                    <div className="h-[300px] w-full">
                      <canvas ref={chartRef} />
                    </div>
                  </GlassPanel>

                  <GlassPanel className="p-6 border-l-4 border-l-momentum-accent bg-momentum-accent/5">
                    <h4 className="text-xs font-bold text-momentum-accent uppercase tracking-widest mb-2">Resumo da Análise</h4>
                    <p className="text-sm text-momentum-text leading-relaxed">
                      Neste cenário, seu runway seria ajustado de <span className="font-bold">{result.baseline.runwayMonths} meses</span> para <span className="font-bold">{result.projected.runwayMonths.toFixed(1)} meses</span>.
                      {result.projected.netCashFlow > 0
                        ? " A operação se tornaria geradora de caixa sustentável."
                        : " Atenção: o fluxo de caixa permaneceria negativo, exigindo monitoramento."}
                    </p>
                  </GlassPanel>
                </div>
              )}
            </AsyncPanel>
          </div>
        </div>
      </div>

      <UpgradeRequiredModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        feature={upgradeInfo?.feature}
        plan={upgradeInfo?.plan}
      />
    </>
  );
}
