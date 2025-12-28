// web/src/components/Topbar.tsx
import React, { useRef } from "react";
import { useTheme } from "../hooks/useTheme";
import { AlertsBell } from "./AlertsBell";

type TopbarProps = { onMenuClick?: () => void };

const Topbar: React.FC<TopbarProps> = ({ onMenuClick }) => {
  const { theme, toggle } = useTheme();
  const searchRef = useRef<HTMLInputElement | null>(null);

  return (
    <header
      className={[
        "fixed top-0 left-0 md:left-60 right-0 h-14 flex items-center justify-between",
        "px-4 md:px-6 z-50",
        "backdrop-blur-xl border-b transition-all duration-300",
        // Light – barra clara, limpa
        "bg-white/80 border-slate-200 shadow-sm",
        // Dark – fundo discreto, sem gradient pesado
        "dark:bg-slate-950/90 dark:border-slate-800 dark:shadow-none",
      ].join(" ")}
      role="banner"
    >
      {/* Botão de menu (mobile) */}
      <button
        onClick={onMenuClick}
        aria-label="Abrir menu lateral"
        aria-controls="app-sidebar"
        className="md:hidden mr-3 inline-flex items-center justify-center px-3 py-2 rounded-md
                   border border-slate-200/70 dark:border-slate-700
                   bg-white/80 dark:bg-slate-900/70
                   text-[color:var(--text-1)] shadow-sm hover:shadow-md transition-all duration-300"
        title="Menu"
      >
        <span aria-hidden="true">☰</span>
        <span className="sr-only">Menu</span>
      </button>

      {/* Campo de busca */}
      <div
        className="flex items-center gap-2 flex-1 max-w-md px-3 py-1.5 rounded-full
                   border border-slate-200 dark:border-slate-700
                   bg-white/80 dark:bg-slate-900/70
                   shadow-inner backdrop-blur-xl transition-all duration-300"
        role="search"
        aria-label="Buscar"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 text-[color:var(--text-2)]"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1010.5 18a7.5 7.5 0 006.15-3.35z"
          />
        </svg>
        <input
          ref={searchRef}
          type="text"
          placeholder="Buscar transações..."
          aria-label="Buscar transações"
          className="bg-transparent outline-none text-sm text-[color:var(--text-1)] w-full placeholder:[color:var(--text-2)]"
        />
      </div>

      {/* Ações à direita */}
      <div className="flex items-center gap-3 ml-3">
        {/* Centro de Alertas */}
        <AlertsBell />

        {/* Alternador de tema */}
        <button
          onClick={toggle}
          className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700
                     bg-white/80 dark:bg-slate-900/80
                     text-[color:var(--text-1)] text-xs font-medium
                     shadow-sm hover:shadow-md transition-all duration-300"
          aria-label={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
          title={theme === "dark" ? "Tema claro" : "Tema escuro"}
        >
          {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
        </button>

        {/* Avatar Momentum (placeholder) */}
        <div
          className="w-9 h-9 rounded-full bg-gradient-to-r from-[var(--brand-1)] to-[var(--brand-2)]
                     flex items-center justify-center text-white font-semibold shadow-lg
                     hover:scale-105 transition-transform duration-300"
          role="img"
          aria-label="Perfil"
          title="Perfil"
        >
          M
        </div>
      </div>
    </header>
  );
};

export default Topbar;
