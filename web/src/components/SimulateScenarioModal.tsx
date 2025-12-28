// web/src/components/SimulateScenarioModal.tsx
import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { track } from "../lib/analytics";
import { useToast } from "./Toast";
import { UpgradeRequiredModal } from "./UpgradeRequiredModal";
import {
  CfoApi,
  SimpleSimulationInput,
  SimpleSimulationResponse,
} from "../services/CfoApi";

type Baseline = {
  cashBalance?: number;
  revenueMonth?: number;
  expenseMonth?: number;
  runwayMonths?: number;
};

type SimulateScenarioModalProps = {
  open: boolean;
  onClose: () => void;
  baseline: Baseline; // dashboard manda {} quando não tiver dados
  onConfirm?: (params: SimpleSimulationInput) => void;
};

const DEFAULT_INPUT: SimpleSimulationInput = {
  incDeltaPct: 0,
  expDeltaPct: 0,
  oneOffIncome: 0,
  oneOffExpense: 0,
};

const SimulateScenarioModal: React.FC<SimulateScenarioModalProps> = ({
  open,
  onClose,
  baseline,
  onConfirm,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap(containerRef as any, open);

  const { notify } = useToast();

  const [form, setForm] = useState<SimpleSimulationInput>(DEFAULT_INPUT);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<SimpleSimulationResponse | null>(null);

  // Modal de upgrade de plano
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeInfo, setUpgradeInfo] = useState<{
    feature?: string;
    plan?: string;
  } | null>(null);

  // Resetar estado quando abrir
  useEffect(() => {
    if (open) {
      track("simulate_opened");
      setForm(DEFAULT_INPUT);
      setResult(null);
      setUpgradeOpen(false);
      setUpgradeInfo(null);
    }
  }, [open]);

  if (!open) return null;

  const handleChange =
    (field: keyof SimpleSimulationInput) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setForm((prev) => ({
        ...prev,
        [field]: value === "" ? undefined : Number(value),
      }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload: SimpleSimulationInput = {
        incDeltaPct: form.incDeltaPct ?? 0,
        expDeltaPct: form.expDeltaPct ?? 0,
        oneOffIncome: form.oneOffIncome ?? 0,
        oneOffExpense: form.oneOffExpense ?? 0,
      };

      track("cfo_simulate_submit", payload);

      const response = await CfoApi.simulate(payload);
      setResult(response);

      onConfirm?.(payload);

      notify({
        type: "success",
        message: "Simulação realizada com sucesso.",
      });
    } catch (err: any) {
      console.error("Erro na simulação do CFO:", err);

      const status = err?.response?.status;
      const data = err?.response?.data;

      // Tratamento específico para gating de plano
      if (status === 403 && data?.code === "UPGRADE_REQUIRED") {
        setUpgradeInfo({
          feature: data.feature,
          plan: data.plan,
        });
        setUpgradeOpen(true);

        notify({
          type: "warning",
          message:
            "Essa simulação faz parte de um recurso avançado do CFO. Fale com o suporte para ativar o plano ideal para sua empresa.",
        });
      } else {
        notify({
          type: "error",
          message:
            "Não foi possível executar a simulação agora. Tente novamente em alguns instantes.",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const baseIncome = baseline.revenueMonth ?? 0;
  const baseExpense = baseline.expenseMonth ?? 0;
  const baseRunway = baseline.runwayMonths ?? 0;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="simulate-title"
    >
      <div
        ref={containerRef}
        className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950/95 p-5 shadow-xl shadow-black/60"
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2
              id="simulate-title"
              className="text-sm font-semibold text-slate-50"
            >
              Simular cenário financeiro
            </h2>
            <p className="text-xs text-slate-400">
              Ajuste receita, despesas e eventos pontuais para ver o impacto
              imediato no seu fluxo de caixa.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 text-slate-400 hover:text-slate-100 hover:bg-slate-900"
            aria-label="Fechar simulação"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Baseline resumida */}
        <div className="mb-4 grid grid-cols-3 gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-[11px] text-slate-300">
          <div>
            <p className="uppercase tracking-wide text-slate-500 text-[10px]">
              Receita mensal
            </p>
            <p className="font-semibold text-slate-50">
              R{" "}
              {baseIncome.toLocaleString("pt-BR", {
                maximumFractionDigits: 0,
              })}
            </p>
          </div>
          <div>
            <p className="uppercase tracking-wide text-slate-500 text-[10px]">
              Despesa mensal
            </p>
            <p className="font-semibold text-slate-50">
              R{" "}
              {baseExpense.toLocaleString("pt-BR", {
                maximumFractionDigits: 0,
              })}
            </p>
          </div>
          <div>
            <p className="uppercase tracking-wide text-slate-500 text-[10px]">
              Runway estimado
            </p>
            <p className="font-semibold text-slate-50">
              {baseRunway ? `${baseRunway.toFixed(1)} meses` : "—"}
            </p>
          </div>
        </div>

        {/* Formulário de simulação */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                Aumento de receita (%)
              </label>
              <input
                type="number"
                step="1"
                min={-100}
                max={200}
                value={form.incDeltaPct ?? ""}
                onChange={handleChange("incDeltaPct")}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-2 py-1.5 text-xs text-slate-100 outline-none focus:ring-1 focus:ring-sky-500"
                placeholder="ex: 10"
              />
              <p className="mt-1 text-[10px] text-slate-500">
                Ex.: 10 = crescer 10% na receita.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                Variação de despesas (%)
              </label>
              <input
                type="number"
                step="1"
                min={-100}
                max={200}
                value={form.expDeltaPct ?? ""}
                onChange={handleChange("expDeltaPct")}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-2 py-1.5 text-xs text-slate-100 outline-none focus:ring-1 focus:ring-sky-500"
                placeholder="ex: -5"
              />
              <p className="mt-1 text-[10px] text-slate-500">
                Ex.: -5 = reduzir gastos em 5%.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                Receita pontual (R$)
              </label>
              <input
                type="number"
                step="100"
                min={0}
                value={form.oneOffIncome ?? ""}
                onChange={handleChange("oneOffIncome")}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-2 py-1.5 text-xs text-slate-100 outline-none focus:ring-1 focus:ring-sky-500"
                placeholder="ex: 10000"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                Despesa pontual (R$)
              </label>
              <input
                type="number"
                step="100"
                min={0}
                value={form.oneOffExpense ?? ""}
                onChange={handleChange("oneOffExpense")}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-2 py-1.5 text-xs text-slate-100 outline-none focus:ring-1 focus:ring-sky-500"
                placeholder="ex: 5000"
              />
            </div>
          </div>

          {/* Resultado da simulação */}
          {result && (
            <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-[11px] text-slate-200 space-y-1.5">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">
                Resultado da simulação
              </p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <p className="text-slate-400 text-[10px]">Nova receita</p>
                  <p className="font-semibold text-slate-50">
                    R{" "}
                    {result.result.newIncome.toLocaleString("pt-BR", {
                      maximumFractionDigits: 0,
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px]">Nova despesa</p>
                  <p className="font-semibold text-slate-50">
                    R{" "}
                    {result.result.newExpense.toLocaleString("pt-BR", {
                      maximumFractionDigits: 0,
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px]">Fluxo líquido</p>
                  <p
                    className={`font-semibold ${
                      result.result.net >= 0
                        ? "text-emerald-400"
                        : "text-red-400"
                    }`}
                  >
                    R{" "}
                    {result.result.net.toLocaleString("pt-BR", {
                      maximumFractionDigits: 0,
                    })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Ações */}
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
              disabled={isSubmitting}
            >
              Fechar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-sky-500 px-4 py-1.5 text-xs font-semibold text-white shadow hover:bg-sky-400 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Simulando..." : "Simular cenário"}
            </button>
          </div>
        </form>

        {/* Modal de upgrade de plano */}
        <UpgradeRequiredModal
          open={upgradeOpen}
          onClose={() => setUpgradeOpen(false)}
          feature={upgradeInfo?.feature}
          plan={upgradeInfo?.plan}
        />
      </div>
    </div>
  );
};

export default SimulateScenarioModal;
