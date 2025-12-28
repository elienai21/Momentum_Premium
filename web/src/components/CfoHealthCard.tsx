// web/src/components/CfoHealthCard.tsx
import { useEffect, useState } from "react";
import {
  getCfoHealth,
  CfoHealth,
  CfoHealthStatus,
} from "../services/CfoApi";
import { AlertTriangle, AlertOctagon, CheckCircle2 } from "lucide-react";

function statusConfig(status: CfoHealthStatus) {
  switch (status) {
    case "EXCELLENT":
      return {
        label: "Excelente",
        level: "Nível 4 – CFO de Elite",
        badgeClass:
          "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-500/40",
        icon: CheckCircle2,
      };
    case "STABLE":
      return {
        label: "Estável",
        level: "Nível 3 – Estrutura saudável",
        badgeClass:
          "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-500/40",
        icon: CheckCircle2,
      };
    case "CRITICAL":
      return {
        label: "Crítico",
        level: "Nível 2 – Atenção máxima",
        badgeClass:
          "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-500/40",
        icon: AlertTriangle,
      };
    case "DANGER":
    default:
      return {
        label: "Perigo",
        level: "Nível 1 – Risco de sobrevivência",
        badgeClass:
          "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-500/40",
        icon: AlertOctagon,
      };
  }
}

export function CfoHealthCard() {
  const [health, setHealth] = useState<CfoHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const h = await getCfoHealth();
        if (!cancelled) {
          setHealth(h);
        }
      } catch (e: any) {
        console.error("[CFO Health] Erro ao carregar:", e);
        if (!cancelled) {
          setError(
            "Não consegui carregar o Health Score financeiro. Tente recarregar a página."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <section className="rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <div className="h-4 w-40 rounded bg-slate-200/70 dark:bg-slate-700 mb-4" />
        <div className="h-10 w-24 rounded bg-slate-200/70 dark:bg-slate-700 mb-2" />
        <div className="h-3 w-52 rounded bg-slate-200/70 dark:bg-slate-700" />
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50/90 p-5 text-sm text-red-800 dark:border-red-500/50 dark:bg-red-950/40 dark:text-red-200">
        {error}
      </section>
    );
  }

  if (!health) {
    return (
      <section className="rounded-2xl border border-slate-200/70 bg-white/80 p-5 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-200">
        Ainda não há dados financeiros suficientes para calcular o Health Score
        do CFO. Importe algumas movimentações para que o sistema consiga
        analisar seu momento financeiro.
      </section>
    );
  }

  const cfg = statusConfig(health.status);
  const Icon = cfg.icon;

  const maturityLabel =
    health.status === "EXCELLENT"
      ? "Maturidade Financeira: Nível 4 (Avançado)"
      : health.status === "STABLE"
      ? "Maturidade Financeira: Nível 3 (Intermediário)"
      : health.status === "CRITICAL"
      ? "Maturidade Financeira: Nível 2 (Em risco)"
      : "Maturidade Financeira: Nível 1 (Crítico)";

  return (
    <section className="rounded-2xl border border-slate-200/70 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-slate-700 dark:text-slate-100 uppercase">
            Health Score Financeiro
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5">
            Visão consolidada de caixa, margem e endividamento.
          </p>
        </div>

        <span
          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium ${cfg.badgeClass}`}
        >
          <Icon className="h-3.5 w-3.5" />
          {cfg.label}
        </span>
      </div>

      {/* Score + Maturidade */}
      <div className="flex flex-wrap items-end gap-6 mb-4">
        <div>
          <div className="text-[32px] leading-none font-semibold text-slate-900 dark:text-white">
            {health.score.toFixed(0)}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
            Score calculado com base no fluxo de caixa, margem e estrutura de
            dívidas.
          </p>
        </div>

        <div className="flex-1 min-w-[160px]">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-100 mb-1">
            {maturityLabel}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-300">
            {cfg.level}
          </p>
        </div>
      </div>

      {/* Comentário da IA */}
      {health.aiComment && (
        <div className="mt-2 rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100">
          <p className="font-medium mb-1 text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-300">
            Comentário do CFO IA
          </p>
          <p>{health.aiComment}</p>
        </div>
      )}

      {/* Rodapé com runway e data */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
        <span>
          Runway estimado:{" "}
          <strong className="text-slate-700 dark:text-slate-100">
            {health.runwayMonths.toFixed(1)} meses
          </strong>
        </span>
        <span>
          Atualizado em{" "}
          {new Date(health.updatedAt).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "2-digit",
          })}
        </span>
      </div>
    </section>
  );
}
