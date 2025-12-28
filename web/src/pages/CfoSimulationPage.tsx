// web/src/pages/CfoSimulationPage.tsx
import React, { useState } from "react";
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
import { Line } from "react-chartjs-2";
import { Loader2, TrendingUp, AlertTriangle, Calculator } from "lucide-react";
import { CfoApi, AdvancedSimulationResponse } from "../services/CfoApi";
import { UpgradeRequiredModal } from "../components/UpgradeRequiredModal";

// Registro de componentes do Chart.js (obrigatório para não quebrar)
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

// Helper rápido de formatação se não houver lib
const fmtMoney = (val: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(val);

export default function CfoSimulationPage() {
  const [activeTab, setActiveTab] = useState<"simple" | "advanced">("simple");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Estado: Simulação Simples ---
  const [incDeltaPct, setIncDeltaPct] = useState(0);
  const [expDeltaPct, setExpDeltaPct] = useState(0);
  const [oneOffExpense, setOneOffExpense] = useState(0);

  // --- Estado: Simulação Avançada ---
  const [advRecurringExp, setAdvRecurringExp] = useState(0);
  const [advGrowthRate, setAdvGrowthRate] = useState(0); // em % (0 a 100) no input
  const [advOneTimeExp, setAdvOneTimeExp] = useState(0);

  // --- Estado: Resultados ---
  // Unificamos a visualização no formato "Avançado" pois é mais rico.
  // Se vier do simples, adaptamos.
  const [result, setResult] = useState<AdvancedSimulationResponse | null>(null);

  // --- Estado: Upgrade de plano / feature gating ---
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeInfo, setUpgradeInfo] = useState<{
    feature?: string;
    plan?: string;
  } | null>(null);

  function handleUpgradeError(err: any, contexto: "simple" | "advanced") {
    const status = err?.status;
    const message: string = err?.message || "";

    // Padrão vindo do interceptor de api.ts:
    // status: 403, message: "UPGRADE_REQUIRED:cfo_simulator_advanced:Plano Pro"
    if (status === 403 && message.startsWith("UPGRADE_REQUIRED")) {
      const parts = message.split(":");
      const featureKey = parts[1] || (contexto === "advanced"
        ? "cfo_simulator_advanced"
        : "cfo_simulator");
      const planName = parts[2];

      setUpgradeInfo({
        feature: featureKey,
        plan: planName,
      });
      setUpgradeOpen(true);

      setError(
        contexto === "advanced"
          ? "O cenário avançado faz parte de um recurso premium do CFO. Fale com o suporte para ativar no seu plano."
          : "O simulador CFO faz parte de um recurso premium. Fale com o suporte para ativar no seu plano.",
      );
      return;
    }

    // Erro genérico
    setError(
      message ||
        (contexto === "advanced"
          ? "Erro ao executar simulação avançada."
          : "Erro ao executar simulação simples."),
    );
  }

  // Handlers
  const handleSimulateSimple = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await CfoApi.simulate({
        incDeltaPct,
        expDeltaPct,
        oneOffExpense,
      });

      // Adaptador para o formato visual unificado, caso o backend simples retorne estrutura diferente
      // Aqui simulamos uma projeção linear simples caso a API simples não devolva 'monthlyProjection'
      const simulatedProjection =
        resp.monthlyProjection ||
        Array.from({ length: 6 }).map((_, i) => ({
          month: i + 1,
          balance: resp.result.net * (i + 1), // Projeção ingênua apenas para gráfico não quebrar
        }));

      setResult({
        ok: true,
        baseline: {
          avgIncome: resp.base.income,
          avgExpense: resp.base.expense,
          runwayMonths: 0, // Backend simples pode não retornar runway, tratar visualmente
        },
        projected: {
          avgIncome: resp.result.newIncome,
          avgExpense: resp.result.newExpense,
          runwayMonths: 0,
          netCashFlow: resp.result.net,
        },
        deltas: {
          runwayImpact: 0,
          cashImpact:
            resp.result.net - (resp.base.income - resp.base.expense),
        },
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
        growthRateIncome: advGrowthRate / 100, // converte % para decimal
        oneTimeExpense: advOneTimeExp,
      });
      setResult(resp);
    } catch (err: any) {
      handleUpgradeError(err, "advanced");
    } finally {
      setLoading(false);
    }
  };

  // Configuração do Gráfico
  const chartData = {
    labels: ["Mês 1", "Mês 2", "Mês 3", "Mês 4", "Mês 5", "Mês 6"],
    datasets: [
      {
        label: "Saldo Projetado (Cenário)",
        // ✅ Usa optional chaining também em monthlyProjection para evitar erro quando result for null
        data: result?.monthlyProjection?.map((p) => p.balance) || [],
        borderColor: "rgb(16, 185, 129)", // Emerald 500
        backgroundColor: "rgba(16, 185, 129, 0.5)",
        tension: 0.3,
      },
      // Poderíamos adicionar uma linha de "Baseline" se o backend retornasse a projeção do cenário atual
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" as const },
      title: { display: false },
    },
    scales: {
      y: {
        grid: { color: "rgba(255, 255, 255, 0.1)" },
        ticks: { color: "#9ca3af" },
      },
      x: {
        grid: { display: false },
        ticks: { color: "#9ca3af" },
      },
    },
  };

  return (
    <>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calculator className="h-6 w-6 text-brand1" />
            Simulador CFO
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Projete cenários futuros e veja o impacto no seu Runway e Fluxo de
            Caixa.
          </p>
        </header>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-200 dark:border-white/10 pb-1">
          <button
            onClick={() => {
              setActiveTab("simple");
              setError(null);
            }}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === "simple"
                ? "bg-white dark:bg-slate-800 border-b-2 border-brand1 text-brand1"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
            }`}
          >
            Ajuste Rápido
          </button>
          <button
            onClick={() => {
              setActiveTab("advanced");
              setError(null);
            }}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === "advanced"
                ? "bg-white dark:bg-slate-800 border-b-2 border-brand1 text-brand1"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
            }`}
          >
            Cenário Avançado
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Painel de Controle (Inputs) */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-white/10 shadow-sm">
              {activeTab === "simple" ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Variação de Receita (%)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="-50"
                        max="50"
                        step="5"
                        value={incDeltaPct}
                        onChange={(e) => setIncDeltaPct(Number(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand1"
                      />
                      <span className="w-12 text-right text-sm font-semibold dark:text-white">
                        {incDeltaPct > 0 ? "+" : ""}
                        {incDeltaPct}%
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Variação de Despesas (%)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="-50"
                        max="50"
                        step="5"
                        value={expDeltaPct}
                        onChange={(e) => setExpDeltaPct(Number(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-500"
                      />
                      <span className="w-12 text-right text-sm font-semibold dark:text-white">
                        {expDeltaPct > 0 ? "+" : ""}
                        {expDeltaPct}%
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Gasto Extra Pontual (R$)
                    </label>
                    <input
                      type="number"
                      value={oneOffExpense}
                      onChange={(e) =>
                        setOneOffExpense(Number(e.target.value))
                      }
                      className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg text-sm"
                      placeholder="Ex: 5000"
                    />
                  </div>

                  <button
                    onClick={handleSimulateSimple}
                    disabled={loading}
                    className="w-full py-2.5 bg-brand1 text-white rounded-xl font-medium text-sm hover:opacity-90 disabled:opacity-50 flex justify-center items-center gap-2"
                  >
                    {loading ? (
                      <Loader2 className="animate-spin h-4 w-4" />
                    ) : (
                      "Simular Cenário"
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Inputs Avançados */}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Aumento de Custo Recorrente (R$/mês)
                    </label>
                    <input
                      type="number"
                      value={advRecurringExp}
                      onChange={(e) =>
                        setAdvRecurringExp(Number(e.target.value))
                      }
                      className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg text-sm"
                      placeholder="Ex: Contratação, Aluguel..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Taxa de Crescimento de Receita (%)
                    </label>
                    <input
                      type="number"
                      value={advGrowthRate}
                      onChange={(e) =>
                        setAdvGrowthRate(Number(e.target.value))
                      }
                      className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg text-sm"
                      placeholder="Ex: 10 para 10%"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Investimento Único (R$)
                    </label>
                    <input
                      type="number"
                      value={advOneTimeExp}
                      onChange={(e) =>
                        setAdvOneTimeExp(Number(e.target.value))
                      }
                      className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg text-sm"
                      placeholder="Ex: Compra de equipamento"
                    />
                  </div>

                  <button
                    onClick={handleSimulateAdvanced}
                    disabled={loading}
                    className="w-full py-2.5 bg-brand1 text-white rounded-xl font-medium text-sm hover:opacity-90 disabled:opacity-50 flex justify-center items-center gap-2"
                  >
                    {loading ? (
                      <Loader2 className="animate-spin h-4 w-4" />
                    ) : (
                      "Calcular Impacto"
                    )}
                  </button>
                </div>
              )}

              {error && (
                <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                  <span className="text-xs text-rose-700">{error}</span>
                </div>
              )}
            </div>
          </div>

          {/* Resultados */}
          <div className="lg:col-span-2 space-y-6">
            {!result ? (
              <div className="h-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-xl text-slate-400">
                <TrendingUp className="h-10 w-10 mb-2 opacity-50" />
                <p className="text-sm">
                  Configure os parâmetros e clique em simular para ver a
                  projeção.
                </p>
              </div>
            ) : (
              <>
                {/* Cards de Métricas */}
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
                    <span className="text-xs text-slate-500 uppercase font-semibold">
                      Novo Runway
                    </span>
                    <div
                      className={`text-2xl font-bold mt-1 ${
                        result.projected.runwayMonths < 3
                          ? "text-rose-500"
                          : "text-emerald-500"
                      }`}
                    >
                      {result.projected.runwayMonths.toFixed(1)} meses
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      Impacto:{" "}
                      {result.deltas.runwayImpact > 0 ? "+" : ""}
                      {result.deltas.runwayImpact.toFixed(1)} meses
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
                    <span className="text-xs text-slate-500 uppercase font-semibold">
                      Fluxo Líquido (Proj.)
                    </span>
                    <div
                      className={`text-2xl font-bold mt-1 ${
                        result.projected.netCashFlow >= 0
                          ? "text-emerald-500"
                          : "text-rose-500"
                      }`}
                    >
                      {fmtMoney(result.projected.netCashFlow)}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      Média mensal
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
                    <span className="text-xs text-slate-500 uppercase font-semibold">
                      Novo Burn Rate
                    </span>
                    <div className="text-2xl font-bold mt-1 text-slate-700 dark:text-slate-200">
                      {fmtMoney(result.projected.avgExpense)}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      Despesa mensal média
                    </div>
                  </div>
                </div>

                {/* Gráfico */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">
                    Projeção de Saldo Acumulado (6 Meses)
                  </h3>
                  <div className="h-[300px]">
                    <Line data={chartData} options={chartOptions} />
                  </div>
                </div>

                {/* Interpretação Textual */}
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-500/20 p-4 rounded-xl text-sm text-emerald-800 dark:text-emerald-200">
                  <strong>Análise:</strong> Com este cenário, seu runway passa
                  de
                  <span className="font-bold">
                    {" "}
                    {result.baseline.runwayMonths}{" "}
                  </span>
                  para
                  <span className="font-bold">
                    {" "}
                    {result.projected.runwayMonths.toFixed(1)}{" "}
                  </span>
                  meses.
                  {result.projected.netCashFlow > 0
                    ? " A empresa passa a gerar caixa positivo."
                    : " Atenção: a empresa continua queimando caixa."}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal de upgrade quando o plano não permite usar o simulador */}
      <UpgradeRequiredModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        featureName={
          activeTab === "advanced"
            ? "Simulador CFO – Cenário Avançado"
            : "Simulador CFO"
        }
        featureKey={upgradeInfo?.feature}
        currentPlan={upgradeInfo?.plan}
      />
    </>
  );
}
