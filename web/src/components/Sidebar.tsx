// web/src/components/Sidebar.tsx
import React from "react";
import { NavLink } from "react-router-dom";
import { TrendingUp } from "lucide-react";

type SidebarProps = {
  open?: boolean;
  onClose?: () => void;
};

const Sidebar: React.FC<SidebarProps> = ({ open = false, onClose }) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === "Escape") {
      onClose?.();
    }
  };

  const menuPrincipal = [
    { label: "Dashboard", path: "/", icon: "dashboard" },
    { label: "Transações", path: "/transactions", icon: "receipt_long" },
    { label: "Auditoria & Limpeza", path: "/data-cleaning", icon: "verified_user" },
    { label: "IA & Insights", path: "/insights", icon: "psychology", badge: "NEW" },
    { label: "Mercado", path: "/market-news", icon: <TrendingUp size={22} /> },
    { label: "Deep Dive Financeiro", path: "/cfo/deep-dive", icon: "finance_mode" },
  ];

  const menuGerenciamento = [
    { label: "Clientes", path: "/clients", icon: "people" },
    { label: "Real Estate", path: "/real-estate", icon: "domain" },
    { label: "Configurações", path: "/settings", icon: "settings" },
  ];

  const renderNavItems = (items: typeof menuPrincipal) => {
    return items.map((item) => (
      <NavLink
        key={item.path}
        to={item.path}
        onClick={onClose}
        className={({ isActive }: { isActive: boolean }) =>
          [
            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group mx-2",
            isActive
              ? "bg-primary text-white shadow-glow"
              : "text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5",
          ].join(" ")
        }
      >
        {typeof item.icon === "string" ? (
          <span className="material-symbols-outlined text-[22px] transition-colors">
            {item.icon}
          </span>
        ) : (
          <span className="transition-colors flex items-center justify-center">
            {item.icon}
          </span>
        )}
        <span className="text-[14px] font-medium">{item.label}</span>
        {item.badge && (
          <span className="ml-auto bg-gradient-to-r from-primary to-secondary text-[10px] px-1.5 py-0.5 rounded text-white font-bold">
            {item.badge}
          </span>
        )}
      </NavLink>
    ));
  };

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/50 md:hidden transition-opacity z-40 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
        aria-hidden={!open}
      />

      <aside
        id="app-sidebar"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={[
          "fixed top-0 left-0 h-full w-64 z-50 flex flex-col glass border-r border-slate-200 dark:border-slate-800 transition-all duration-300",
          "transform transition-transform duration-500 ease-in-out",
          open ? "translate-x-0" : "-translate-x-64",
          "md:translate-x-0",
        ].join(" ")}
      >
        <div className="h-20 flex items-center px-6">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg dark:bg-primary/20">
              <img
                src="/assets/brand/momentum-logo.png"
                alt="Momentum Logo"
                className="w-6 h-6 object-contain"
              />
            </div>
            <div>
              <h1 className="text-[17px] font-bold tracking-tight text-slate-900 dark:text-white leading-none font-display">MOMENTUM</h1>
              <span className="text-[9px] font-bold tracking-[0.2em] text-primary uppercase font-display mt-1 block opacity-80">PREMIUM V14.6</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="md:hidden ml-auto inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 text-slate-600 dark:text-slate-300"
          >
            ×
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1 py-4 overflow-y-auto">
          <p className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] mb-4 mt-2 font-display">PRINCIPAL</p>
          {renderNavItems(menuPrincipal)}

          <p className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] mt-8 mb-4 font-display">GERENCIAMENTO</p>
          {renderNavItems(menuGerenciamento)}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 mt-auto">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold dark:text-slate-300">GM</div>
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-slate-900 dark:text-slate-200 font-display">Glass Momentum</span>
              <span className="text-[9px] text-slate-500 font-display uppercase tracking-wider">v14.6 Enterprise</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
