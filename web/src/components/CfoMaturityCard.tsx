// web/src/components/CfoMaturityCard.tsx
import React from "react";

interface CfoMaturityCardProps {
  healthScore?: any | null;
}

/**
 * Extrai um score numérico independente do formato:
 * - number direto
 * - { score: number }
 * - ou outros formatos futuros (retorna null se não achar)
 */
function resolveScore(raw: any): number | null {
  if (raw == null) return null;

  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : null;
  }

  if (typeof raw === "object" && typeof raw.score === "number") {
    return Number.isFinite(raw.score) ? raw.score : null;
  }

  return null;
}

function mapScoreToLevel(score: number | null) {
  if (score == null) {
    return {
      level: "—",
      label: "Maturidade não calculada",
      description:
        "Importe seus dados financeiros e deixe o CFO virtual avaliar em que estágio sua gestão está hoje.",
      badgeColor: "bg-slate-200 text-slate-700",
      barClass: "bg-slate-300",
      percent: 0,
    };
  }

  let level = 1;
  let label = "Sobrevivência financeira";
  let description =
    "A empresa ainda opera de forma muito reativa. O foco é sobreviver mês a mês, com pouca previsibilidade de caixa.";

  if (score >= 40 && score < 60) {
    level = 2;
    label = "Operação básica";
    description =
      "Há algum controle de entradas e saídas, mas decisões ainda são tomadas sem uma visão consolidada de caixa e margem.";
  } else if (score >= 60 && score < 75) {
    level = 3;
    label = "Controles essenciais";
    description =
      "A empresa já enxerga bem receitas e despesas, começa a acompanhar indicadores e tem base para tomar decisões melhores.";
  } else if (score >= 75 && score < 90) {
    level = 4;
    label = "Gestão estratégica";
    description =
      "Além de controlar bem o hoje, a empresa compara cenários, projeta caixa e usa números na estratégia do negócio.";
  } else if (score >= 90) {
    level = 5;
    label = "Alta performance financeira";
    description =
      "A gestão financeira é profissional. Há previsões, simulações recorrentes, rotina de análise e decisões guiadas por dados.";
  }

  // Normaliza o score (0–100) para a barrinha.
  const percent = Math.max(0, Math.min(100, score));

  const badgeColor =
    level >= 4
      ? "bg-emerald-100 text-emerald-800"
      : level === 3
      ? "bg-sky-100 text-sky-800"
      : "bg-amber-100 text-amber-800";

  const barClass =
    level >= 4
      ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
      : level === 3
      ? "bg-gradient-to-r from-sky-400 to-sky-500"
      : "bg-gradient-to-r from-amber-400 to-amber-500";

  return {
    level,
    label,
    description,
    badgeColor,
    barClass,
    percent,
  };
}

export function CfoMaturityCard({ healthScore }: CfoMaturityCardProps) {
  const score = resolveScore(healthScore);
  const { level, label, description, badgeColor, barClass, percent } =
    mapScoreToLevel(score);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
      <header className="mb-2 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Nível de maturidade financeira
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-300">
            Classificação em 5 níveis, baseada no seu Health Score atual.
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badgeColor}`}
        >
          Nível {level}
        </span>
      </header>

      <p className="text-xs font-medium text-slate-800 dark:text-slate-100">
        {label}
      </p>
      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-300">
        {description}
      </p>

      <div className="mt-3 space-y-1">
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span>Maturidade atual</span>
          <span>{score != null ? `${score.toFixed(0)} / 100` : "—"}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className={`${barClass} h-2 rounded-full transition-all duration-500`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
        Dica: use o simulador do CFO e o plano de ação para subir de nível ao
        longo dos próximos meses.
      </p>
    </section>
  );
}
