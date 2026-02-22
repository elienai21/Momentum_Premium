// web/src/components/UpgradeRequiredModal.tsx
import { X } from "lucide-react";

type UpgradeRequiredModalProps = {
  open: boolean;
  onClose: () => void;
  feature?: string;
  featureName?: string;
  featureKey?: string;
  plan?: string;
  currentPlan?: string;
};

export function UpgradeRequiredModal({
  open,
  onClose,
  feature,
  featureName,
  featureKey,
  plan,
  currentPlan,
}: UpgradeRequiredModalProps) {
  if (!open) return null;

  const effectiveFeature = feature || featureKey;
  const effectiveFeatureName = featureName || (
    effectiveFeature === "cfo_simulation"
      ? "Simulações avançadas do CFO"
      : effectiveFeature === "cfo_ai_report"
        ? "Relatórios de IA do CFO"
        : "Funcionalidade avançada do CFO"
  );

  const effectivePlan = plan || currentPlan;
  const planLabel = effectivePlan ? effectivePlan.toUpperCase() : "atual";

  const handleTalkToSupport = () => {
    // Dispara o evento para abrir o suporte (já existe no layout)
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("open-support-dock"));
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-amber-400/40 bg-slate-950/95 p-5 shadow-xl shadow-black/70">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id="upgrade-title"
              className="text-sm font-semibold text-amber-100"
            >
              Recurso disponível em um plano superior
            </h2>
            <p className="mt-1 text-xs text-slate-200">
              Você tentou acessar:{" "}
              <span className="font-semibold text-amber-200">
                {effectiveFeatureName}
              </span>
              .
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 text-slate-400 hover:text-slate-100 hover:bg-slate-900"
            aria-label="Fechar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/80 p-3 text-[11px] text-slate-200 space-y-1.5">
          <p>
            No seu plano <span className="font-semibold">{planLabel}</span>, esse
            recurso ainda não está liberado.
          </p>
          <p>
            Para desbloquear simulações completas e relatórios estratégicos do CFO
            IA, você pode falar com o suporte e solicitar o plano{" "}
            <span className="font-semibold text-amber-200">
              Momentum CFO Pro
            </span>
            .
          </p>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
          >
            Agora não
          </button>
          <button
            type="button"
            onClick={handleTalkToSupport}
            className="rounded-xl bg-amber-500 px-4 py-1.5 text-xs font-semibold text-slate-950 shadow hover:bg-amber-400"
          >
            Falar com o suporte
          </button>
        </div>
      </div>
    </div>
  );
}
