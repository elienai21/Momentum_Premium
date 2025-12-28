// web/src/components/EmptyState.tsx
// Objetivo:
// - Unificar assinaturas: aceitar tanto { actionLabel, onActionClick } quanto { primaryActionLabel, onPrimaryAction }.
// - Visual premium consistente com o restante do app.
// - Acessibilidade: aria-live, rótulos claros, foco no CTA.
//
// Uso (compatível com os dois padrões já existentes no código):
//   <EmptyState
//     title="Seu Pulse ainda está em branco"
//     description="Importe suas transações..."
//     actionLabel="Importar agora"            // OU primaryActionLabel="Importar agora"
//     onActionClick={handleImportClick}       // OU onPrimaryAction={handleImportClick}
//     icon="📊"
//   />

import React, { useEffect, useRef } from "react";

type EmptyStateProps = {
  title: string;
  description?: string;
  /** Pode ser string (emoji) ou ReactNode (ícone personalizado) */
  icon?: React.ReactNode | string;

  /** Versão A do CTA (já usada no Dashboard) */
  actionLabel?: string;
  onActionClick?: () => void;

  /** Versão B do CTA (já usada no CFO Section) */
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;

  /** CTA secundário opcional */
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;

  /** Classes extras do container */
  className?: string;

  /** ID opcional para aria-describedby personalizado */
  descriptionId?: string;
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actionLabel,
  onActionClick,
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
  className = "",
  descriptionId,
}) => {
  const ctaRef = useRef<HTMLButtonElement | null>(null);

  // Harmoniza as duas convenções de props:
  const ctaText = primaryActionLabel ?? actionLabel;
  const ctaHandler = onPrimaryAction ?? onActionClick;

  const hasPrimaryCta = Boolean(ctaText && ctaHandler);
  const hasSecondaryCta = Boolean(secondaryActionLabel && onSecondaryAction);

  // Foco automático no CTA principal para acelerar uso por teclado
  useEffect(() => {
    if (hasPrimaryCta) {
      const t = setTimeout(() => ctaRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [hasPrimaryCta]);

  const cx = (...arr: Array<string | false | undefined>) =>
    arr.filter(Boolean).join(" ");

  const descId = descriptionId || "empty-desc";

  return (
    <section
      className={cx(
        "relative z-0",
        "flex flex-col items-center justify-center text-center",
        "rounded-2xl border border-slate-200 bg-white/90 p-8 shadow-sm",
        "dark:bg-[rgba(14,18,28,0.65)] dark:border-white/10",
        className
      )}
      role="region"
      aria-live="polite"
      aria-describedby={description ? descId : undefined}
    >
      {/* Ícone / Emoji */}
      {icon && (
        <div
          className={cx(
            "mb-3 flex h-12 w-12 items-center justify-center rounded-2xl",
            "bg-slate-50 text-2xl shadow-inner",
            "dark:bg-white/5"
          )}
          aria-hidden="true"
        >
          {icon}
        </div>
      )}

      {/* Título */}
      <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">
        {title}
      </h2>

      {/* Descrição */}
      {description && (
        <p
          id={descId}
          className="mt-1 max-w-[60ch] text-sm text-slate-500 dark:text-slate-300"
        >
          {description}
        </p>
      )}

      {/* Ações */}
      {(hasPrimaryCta || hasSecondaryCta) && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {hasPrimaryCta && (
            <button
              ref={ctaRef}
              type="button"
              onClick={ctaHandler}
              className="inline-flex items-center rounded-xl bg-slate-900 px-3 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-black/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-500 dark:bg-emerald-600 dark:hover:bg-emerald-500"
            >
              {ctaText}
            </button>
          )}

          {hasSecondaryCta && (
            <button
              type="button"
              onClick={onSecondaryAction}
              className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {secondaryActionLabel}
            </button>
          )}
        </div>
      )}
    </section>
  );
};
