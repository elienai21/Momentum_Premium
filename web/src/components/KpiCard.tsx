import React, { useId } from "react";

type Variant = "neutral" | "success" | "warning" | "danger" | "info";

interface Props {
  /** Rótulo do KPI (ex.: Receita Mensal) */
  label: string;
  /** Valor numérico do KPI (ex.: 125000) */
  value: number;
  /** Sufixo opcional (ex.: "R$", "%", "itens") — é exibido menor ao lado do valor */
  suffix?: string;

  /** Aparência opcional (define cores de destaque) – padrão: neutral */
  variant?: Variant;
  /** Reduz padding geral para listas muito densas – padrão: false */
  compact?: boolean;
  /** Classe extra para o container externo */
  className?: string;
  /** Precisão opcional (casas decimais) – padrão: 0 */
  precision?: number;
  /** Ícone opcional exibido ao lado do label */
  icon?: React.ReactNode;
  /** Texto auxiliar pequeno exibido abaixo (ex.: “+14% vs. mês anterior”) */
  helpText?: string;
  /** Rótulo ARIA opcional para leitores de tela */
  ariaLabel?: string;
}

/**
 * Componente KPI com estética premium e acessibilidade.
 * Mantém compatibilidade com a API antiga ({ label, value, suffix }) e
 * adiciona melhorias visuais/semânticas sem quebrar usos existentes.
 */
export default function KpiCard({
  label,
  value,
  suffix,
  variant = "neutral",
  compact = false,
  className = "",
  precision = 0,
  icon,
  helpText,
  ariaLabel,
}: Props) {
  const headingId = useId();

  const cx = (...classes: Array<string | undefined | false>) =>
    classes.filter(Boolean).join(" ");

  const palette: Record<Variant, { label: string; ring: string; dot: string; value: string; help: string }> = {
    neutral: {
      label: "text-slate-500 dark:text-slate-300",
      ring: "ring-slate-200 dark:ring-white/10",
      dot: "bg-slate-300 dark:bg-slate-500",
      value: "text-slate-900 dark:text-slate-100",
      help: "text-slate-500 dark:text-slate-400",
    },
    success: {
      label: "text-emerald-700 dark:text-emerald-300",
      ring: "ring-emerald-200/70 dark:ring-emerald-500/30",
      dot: "bg-emerald-400",
      value: "text-emerald-900 dark:text-emerald-200",
      help: "text-emerald-700/80 dark:text-emerald-300/80",
    },
    warning: {
      label: "text-amber-700 dark:text-amber-300",
      ring: "ring-amber-200/70 dark:ring-amber-500/30",
      dot: "bg-amber-400",
      value: "text-amber-900 dark:text-amber-200",
      help: "text-amber-700/80 dark:text-amber-300/80",
    },
    danger: {
      label: "text-rose-700 dark:text-rose-300",
      ring: "ring-rose-200/70 dark:ring-rose-500/30",
      dot: "bg-rose-400",
      value: "text-rose-900 dark:text-rose-200",
      help: "text-rose-700/80 dark:text-rose-300/80",
    },
    info: {
      label: "text-sky-700 dark:text-sky-300",
      ring: "ring-sky-200/70 dark:ring-sky-500/30",
      dot: "bg-sky-400",
      value: "text-sky-900 dark:text-sky-200",
      help: "text-sky-700/80 dark:text-sky-300/80",
    },
  };

  const formatted = value.toLocaleString("pt-BR", {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });

  return (
    <section
      role="group"
      aria-labelledby={headingId}
      aria-label={ariaLabel}
      className={cx(
        "rounded-2xl border bg-white/80 backdrop-blur-xl shadow-sm",
        "dark:bg-[rgba(14,18,28,0.65)] dark:border-white/10",
        "ring-1 " + palette[variant].ring,
        compact ? "p-3" : "p-4",
        className
      )}
    >
      {/* Cabeçalho: label + ícone opcional */}
      <div className="flex items-center gap-2">
        {icon && (
          <div
            className={cx(
              "inline-flex h-6 w-6 items-center justify-center rounded-full",
              "bg-white/70 dark:bg-white/10 shadow-sm"
            )}
            aria-hidden="true"
          >
            {icon}
          </div>
        )}
        <h3
          id={headingId}
          className={cx(
            "text-sm font-medium tracking-wide",
            palette[variant].label
          )}
        >
          {label}
        </h3>
      </div>

      {/* Valor principal */}
      <div className="mt-1 flex items-baseline gap-1">
        <div className={cx("text-2xl font-semibold", palette[variant].value)}>
          {formatted}
        </div>
        {suffix && (
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {suffix}
          </span>
        )}
        {/* indicador decorativo (ponto) para reforçar a cor do variant */}
        <span
          className={cx(
            "ml-auto h-1.5 w-1.5 rounded-full",
            palette[variant].dot
          )}
          aria-hidden="true"
        />
      </div>

      {/* Texto auxiliar opcional */}
      {helpText && (
        <p className={cx("mt-1 text-xs", palette[variant].help)}>{helpText}</p>
      )}
    </section>
  );
}
