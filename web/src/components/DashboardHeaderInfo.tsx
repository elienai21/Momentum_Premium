// web/src/components/DashboardHeaderInfo.tsx
// Header refinado: contraste melhor e visual mais clean/premium.

import React from "react";

type Props = {
  userName: string;
  companyName: string;
  periodLabel: string;
  lastImportLabel?: string;
  lastUpdateLabel?: string;
  isLoading?: boolean;
  className?: string;
};

export const DashboardHeaderInfo: React.FC<Props> = ({
  userName,
  companyName,
  periodLabel,
  lastImportLabel,
  lastUpdateLabel,
  isLoading = false,
  className = "",
}) => {
  const cx = (...c: Array<string | false | undefined>) =>
    c.filter(Boolean).join(" ");

  if (isLoading) {
    return (
      <header
        className={cx(
          "relative z-0",
          "rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-sm",
          "dark:bg-slate-950/70 dark:border-white/10",
          "animate-pulse",
          className,
        )}
        aria-busy="true"
        aria-live="polite"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="h-5 w-40 rounded bg-slate-200 dark:bg-white/10" />
            <div className="h-4 w-56 rounded bg-slate-100 dark:bg-white/10" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-6 w-28 rounded-full bg-slate-100 dark:bg-white/10" />
            <div className="h-6 w-32 rounded-full bg-slate-100 dark:bg-white/10" />
            <div className="h-6 w-40 rounded-full bg-slate-100 dark:bg-white/10" />
          </div>
        </div>
      </header>
    );
  }

  return (
    <header
      className={cx(
        "relative z-0",
        "rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-sm",
        "dark:bg-slate-950/75 dark:border-white/10",
        className,
      )}
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Saudações / contexto primário */}
        <div className="min-w-[240px]">
          <h1 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            Olá,{" "}
            <span className="bg-gradient-to-r from-[var(--brand-1)] to-[var(--brand-2)] bg-clip-text text-transparent">
              {userName}
            </span>
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-300">
            Empresa: <span className="font-medium">{companyName}</span>
          </p>
        </div>

        {/* “Chips” de status/contexto */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
            aria-label={`Período atual: ${periodLabel}`}
          >
            <span
              className="h-1.5 w-1.5 rounded-full bg-slate-400"
              aria-hidden="true"
            />
            {periodLabel}
          </span>

          {lastImportLabel && (
            <span
              className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-100"
              aria-label={`Última importação: ${lastImportLabel}`}
            >
              <span
                className="h-1.5 w-1.5 rounded-full bg-emerald-400"
                aria-hidden="true"
              />
              Última importação: {lastImportLabel}
            </span>
          )}

          {lastUpdateLabel && (
            <span
              className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-800 dark:border-sky-400/40 dark:bg-sky-500/15 dark:text-sky-100"
              aria-label={`Atualizado: ${lastUpdateLabel}`}
            >
              <span
                className="h-1.5 w-1.5 rounded-full bg-sky-400"
                aria-hidden="true"
              />
              Atualizado: {lastUpdateLabel}
            </span>
          )}
        </div>
      </div>
    </header>
  );
};
