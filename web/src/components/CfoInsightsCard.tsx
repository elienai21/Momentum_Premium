// web/src/components/CfoInsightsCard.tsx
import { useState } from "react";
import { FileText, RefreshCw } from "lucide-react";
import { CfoApi, CfoAiReportResult } from "../services/CfoApi";
import { useToast } from "./Toast";
import { UpgradeRequiredModal } from "./UpgradeRequiredModal";

interface CfoInsightsCardProps {
  /** Se quiser desabilitar quando não houver dados suficientes, pode usar depois */
  disabled?: boolean;
}

export function CfoInsightsCard({ disabled }: CfoInsightsCardProps) {
  const { notify } = useToast();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<CfoAiReportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeInfo, setUpgradeInfo] = useState<{
    feature?: string;
    plan?: string;
  } | null>(null);

  async function handleGenerate(periodDays?: number) {
    if (disabled || loading) return;
    setLoading(true);
    setError(null);

    try {
      const result = await CfoApi.getAiReport(periodDays);
      setReport(result);

      notify({
        type: "success",
        message: "Relatório do CFO IA gerado com sucesso.",
      });
    } catch (err: any) {
      const status = err?.status;
      const message =
        err?.message ||
        "Não foi possível gerar o relatório agora. Tente novamente em alguns instantes.";

      if (status === 403) {
        // Com o client axios atual, não recebemos mais .response.data.code,
        // então abrimos um modal genérico de upgrade.
        setUpgradeInfo({
          feature: "cfo_ai_report",
          plan: undefined,
        });
        setUpgradeOpen(true);

        notify({
          type: "warning",
          message:
            "Esse relatório faz parte de um recurso avançado do CFO. Fale com o suporte para ativar o plano ideal para sua empresa.",
        });
      } else {
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.warn("[CFO Insights] Erro ao gerar relatório:", err);
        }
        setError(message);
        notify({
          type: "error",
          message,
        });
      }
    } finally {
      setLoading(false);
    }
  }

  const summary =
    report?.report?.length && report.report.length > 220
      ? report.report.slice(0, 220) + "..."
      : report?.report ?? "";

  const periodLabel = report?.meta?.periodDays
    ? `Últimos ${report.meta.periodDays} dias`
    : "Período padrão (30 dias)";

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
        <header className="mb-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-slate-50 dark:bg-slate-50 dark:text-slate-900">
              <FileText className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                Relatório do CFO IA
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-300">
                Análise executiva em texto, baseada nos seus números dos últimos
                dias.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleGenerate()}
            disabled={loading || disabled}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-slate-50 shadow-sm hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200"
          >
            {loading ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5" />
                Gerar agora
              </>
            )}
          </button>
        </header>

        {error && (
          <p className="mt-2 rounded px-2 py-1 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-500/40 dark:text-amber-200">
            {error}
          </p>
        )}

        {!report && !error && (
          <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-300">
            Clique em <strong>Gerar agora</strong> para receber uma leitura do
            CFO IA sobre sua saúde financeira, riscos e oportunidades mais
            urgentes.
          </p>
        )}

        {report && (
          <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-[11px] text-slate-800 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                Visão executiva do CFO IA
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                {periodLabel}
              </span>
            </div>
            <p className="whitespace-pre-wrap">{summary}</p>
          </div>
        )}
      </section>

      {/* Modal de upgrade quando o plano não permite usar esse recurso */}
      <UpgradeRequiredModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        featureName="Relatório do CFO IA"
        featureKey={upgradeInfo?.feature}
        currentPlan={upgradeInfo?.plan}
      />
    </>
  );
}
