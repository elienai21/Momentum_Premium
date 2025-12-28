import React, { useId } from "react";

type CardProps = {
  title?: React.ReactNode;
  /** Conteúdo principal do card */
  children: React.ReactNode;
  /** Rodapé opcional (observações, totais, metadados) */
  footer?: React.ReactNode;
  /** Classe extra para ajustar o container externo do card */
  className?: string;
  /** Classe extra para ajustar a área de conteúdo (children) */
  contentClassName?: string;
  /** Classe extra para o título */
  titleClassName?: string;
  /** Classe extra para o rodapé */
  footerClassName?: string;
  /** Rótulo ARIA do card (se desejar descrever um propósito específico) */
  ariaLabel?: string;
};

/**
 * Card “glass” com hierarquia visual premium.
 * - Mantém compatibilidade com a API antiga: { title?, children, footer? }
 * - Acessibilidade: usa aria-labelledby quando title está presente; caso contrário, aceita ariaLabel.
 * - Permite ajustar classes externas e internas sem quebrar o uso atual.
 */
export const Card: React.FC<CardProps> = ({
  title,
  children,
  footer,
  className = "",
  contentClassName = "",
  titleClassName = "",
  footerClassName = "",
  ariaLabel,
}) => {
  const headingId = useId();

  // Helper simples para concatenar classes
  const cx = (...classes: Array<string | undefined | false>) =>
    classes.filter(Boolean).join(" ");

  return (
    <section
      role="region"
      aria-label={!title && ariaLabel ? String(ariaLabel) : undefined}
      aria-labelledby={title ? headingId : undefined}
      className={cx(
        // Base “glass” com fallback para claro/escuro
        "rounded-2xl p-5 border shadow-sm glass shadow-3d",
        // Fallbacks de cor quando o utilitário .glass não estiver disponível
        "bg-white/80 backdrop-blur-xl border-slate-200/70",
        "dark:bg-[rgba(14,18,28,0.65)] dark:border-white/10",
        className
      )}
    >
      {title && (
        <div
          id={headingId}
          className={cx(
            "mb-2 text-sm uppercase tracking-wide",
            // Tons discretos e legíveis em ambos temas
            "text-slate-500 dark:text-slate-300",
            titleClassName
          )}
        >
          {title}
        </div>
      )}

      <div
        className={cx(
          // Mantemos o visual anterior (2xl / semibold) p/ compatibilidade,
          // mas agora é personalizável via `contentClassName`
          "mb-2 text-2xl font-semibold text-slate-900 dark:text-slate-100",
          contentClassName
        )}
      >
        {children}
      </div>

      {footer && (
        <div
          className={cx(
            "text-xs text-slate-500 dark:text-slate-400",
            footerClassName
          )}
        >
          {footer}
        </div>
      )}
    </section>
  );
};
