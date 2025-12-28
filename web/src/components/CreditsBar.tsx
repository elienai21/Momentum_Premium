import React from "react";
import { useCredits } from "@/hooks/useCredits";

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatRenewDate(iso: string | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export const CreditsBar: React.FC = () => {
  const { credits, isLoading, error } = useCredits();

  // erro ou sem info de créditos → não quebra nada, só some
  if (error) {
    if (import.meta.env.DEV) {
      console.warn("[CreditsBar] ocultando barra de créditos por erro:", error);
    }
    return null;
  }

  // loading skeleton
  if (isLoading) {
    return (
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white px-4 py-2 animate-pulse">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span>Carregando créditos…</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-2 w-1/3 rounded-full bg-slate-200" />
        </div>
      </div>
    );
  }

  if (!credits) {
    // Sem token ou sem resposta → apenas não mostra
    return null;
  }

  const { available, monthlyQuota, used, renewsAt } = credits;
  const quota = monthlyQuota || 0;
  const percent =
    quota > 0 ? Math.min(100, Math.max(0, (available / quota) * 100)) : 0;

  let barColor = "bg-emerald-500";
  if (percent < 10) {
    barColor = "bg-red-500";
  } else if (percent < 40) {
    barColor = "bg-amber-500";
  }

  const renewText = formatRenewDate(renewsAt);
  const title = renewText
    ? `Renova em ${renewText} • Usados: ${formatNumber(used)}`
    : `Usados: ${formatNumber(used)}`;

  return (
    <div
      className="w-full max-w-md rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm"
      title={title}
    >
      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
        <span className="font-medium text-slate-600">Créditos de IA &amp; Voz</span>
        <span className="font-semibold text-slate-700">
          {formatNumber(available)} / {formatNumber(quota)}
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all ${barColor}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-1 text-[11px] text-slate-400">
        Uso restante deste ciclo. Passe o mouse para ver detalhes.
      </div>
    </div>
  );
};

export default CreditsBar;
