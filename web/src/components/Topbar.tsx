// web/src/components/Topbar.tsx
import React, { useRef } from "react";
import { useTheme } from "../hooks/useTheme";
import { AlertsBell } from "./AlertsBell";
import { CreditsPill } from "./CreditsPill";

type TopbarProps = { onMenuClick?: () => void };

const Topbar: React.FC<TopbarProps> = ({ onMenuClick }) => {
  const { theme, toggle } = useTheme();
  const searchRef = useRef<HTMLInputElement | null>(null);

  return (
    <header
      className={[
        "fixed top-0 right-0 z-20 h-20 px-8 flex items-center justify-between glass border-b border-slate-200 dark:border-slate-800/50 transition-all",
        "left-0 md:left-64", // Standardize alignment to Sidebar width
      ].join(" ")}
      role="banner"
    >
      <div className="flex items-center gap-4 flex-1">
        {/* Botão de menu (mobile) */}
        <button
          onClick={onMenuClick}
          aria-label="Abrir menu lateral"
          className="md:hidden p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300"
        >
          <span className="material-icons-round">menu</span>
        </button>

        {/* Campo de busca */}
        <div className="relative w-full max-w-[440px] hidden md:block group">
          <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[20px] group-focus-within:text-primary transition-colors">search</span>
          <input
            ref={searchRef}
            type="text"
            placeholder="Buscar transações, insights ou clientes..."
            className="w-full bg-slate-100/50 dark:bg-slate-800/50 border-none rounded-full pl-11 pr-4 py-2.5 text-sm text-slate-600 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:bg-white dark:focus:bg-slate-900 transition-all placeholder-slate-400 dark:placeholder-slate-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-5">
        <div className="flex items-center gap-3">
          {/* Créditos de IA */}
          <CreditsPill />

          {/* Alertas */}
          <AlertsBell />

          {/* Alternador de tema */}
          <button
            onClick={toggle}
            className="flex items-center gap-2 px-4 py-2 rounded-full glass border-slate-200 dark:border-white/10 text-[11px] font-bold text-slate-700 dark:text-slate-300 transition-all hover:scale-105 active:scale-95 uppercase tracking-wider shadow-sm"
            aria-label={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
          >
            {theme === "dark" ? (
              <>
                <span className="material-icons-round text-[16px] text-primary">dark_mode</span>
                <span>Dark</span>
              </>
            ) : (
              <>
                <span className="material-icons-round text-[16px] text-warning">light_mode</span>
                <span>Light</span>
              </>
            )}
          </button>
        </div>

        <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>

        {/* Perfil */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block leading-none">
            <p className="text-[14px] font-bold text-slate-900 dark:text-white font-display mb-1">Elienai</p>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 font-display">Admin</p>
          </div>
          <div
            className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-blue-600 flex items-center justify-center text-white text-sm font-bold shadow-glow ring-2 ring-white dark:ring-slate-800 transition-transform hover:scale-110 cursor-pointer"
            role="img"
            aria-label="Perfil"
          >
            E
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
