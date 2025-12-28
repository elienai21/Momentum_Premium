import type { PulseHealth } from "@/services/pulseApi";
import { CheckCircle2, AlertTriangle, AlertOctagon } from "lucide-react";

const LABELS: Record<
  NonNullable<PulseHealth>["status"],
  {
    title: string;
    description: string;
    iconClass: string;
    borderClass: string;
    bgClass: string;
  }
> = {
  red: {
    title: "Crítico",
    description: "Risco alto no caixa e na margem.",
    iconClass: "text-red-500",
    borderClass: "border-red-100 dark:border-red-500/40",
    bgClass: "bg-red-50/80 dark:bg-red-950/40",
  },
  yellow: {
    title: "Atenção",
    description: "Alguns sinais de alerta. Vale revisar custos e runway.",
    iconClass: "text-amber-400",
    borderClass: "border-amber-100 dark:border-amber-500/40",
    bgClass: "bg-amber-50/80 dark:bg-amber-950/40",
  },
  green: {
    title: "Saudável",
    description: "Estrutura financeira relativamente equilibrada.",
    iconClass: "text-emerald-500",
    borderClass: "border-emerald-100 dark:border-emerald-500/40",
    bgClass: "bg-emerald-50/80 dark:bg-emerald-950/40",
  },
};

const ICONS = {
  red: AlertOctagon,
  yellow: AlertTriangle,
  green: CheckCircle2,
} as const;

export function HealthBadge({ health }: { health?: PulseHealth }) {
  if (!health) return null;

  const cfg = LABELS[health.status];
  const Icon = ICONS[health.status];
  const reason = health.reasons?.[0] ?? cfg.description;
  const extraReasonsCount = (health.reasons?.length ?? 0) - 1;

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-xs ${cfg.borderClass} ${cfg.bgClass}`}
    >
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${cfg.iconClass}`} />
        <span className="font-semibold tracking-wide uppercase text-slate-700 dark:text-slate-100">
          Health Score: {cfg.title}
        </span>
      </div>

      <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-200">
        <span>{reason}</span>
        {extraReasonsCount > 0 && (
          <span className="rounded-full bg-white/60 px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-slate-900/60 dark:text-slate-100">
            +{extraReasonsCount} ponto(s) de atenção
          </span>
        )}
      </div>
    </div>
  );
}
