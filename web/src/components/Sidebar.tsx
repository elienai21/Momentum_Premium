// web/src/components/Sidebar.tsx
import React, { useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";

type SidebarProps = {
  open?: boolean;
  onClose?: () => void;
};

const Sidebar: React.FC<SidebarProps> = ({ open = false, onClose }) => {
  const asideRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (open) {
      setTimeout(() => asideRef.current?.focus(), 0);
    }
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === "Escape") {
      onClose?.();
    }
  };

  const menu = [
    { label: "Dashboard", path: "/" },
    { label: "Importar Dados", path: "/imports" },
    { label: "Transações", path: "/transactions" },
    { label: "Auditoria & Limpeza", path: "/data-cleaning" },
    { label: "IA & Insights", path: "/insights" },
    { label: "Clientes", path: "/clients" },
    { label: "Real Estate", path: "/real-estate" },
    { label: "Configurações", path: "/settings" },
    { label: "Analytics + AI", path: "/analytics" },
  ];

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/30 md:hidden transition-opacity z-40 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
        aria-hidden={!open}
      />

      <aside
        ref={(el) => (asideRef.current = el)}
        id="app-sidebar"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        aria-label="Navegação principal"
        aria-hidden={!open && undefined}
        className={[
          "fixed top-0 left-0 h-full w-60 z-50 flex flex-col",
          "backdrop-blur-2xl border-r",
          "bg-[linear-gradient(180deg,rgba(255,255,255,0.9)_0%,rgba(245,247,255,0.75)_40%,rgba(230,235,255,0.6)_100%)]",
          "border-[rgba(255,255,255,0.08)]",
          "dark:bg-[linear-gradient(180deg,rgba(11,15,23,0.9)_0%,rgba(15,22,37,0.85)_60%,rgba(5,8,19,0.9)_100%)]",
          "dark:border-[rgba(255,255,255,0.06)]",
          "shadow-[inset_0_0_25px_rgba(0,0,0,0.45),0_0_10px_rgba(110,52,255,0.15)]",
          "transform transition-transform duration-500 ease-in-out",
          open ? "translate-x-0" : "-translate-x-60",
          "md:translate-x-0",
        ].join(" ")}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <img
              src="/assets/brand/momentum-logo.png"
              alt="Momentum Logo"
              className="w-9 h-9 object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
            />
            <div className="flex flex-col leading-tight">
              <span className="text-base font-semibold text-gradient">MOMENTUM</span>
              <span className="text-[11px] text-[var(--text-2)] font-medium">V14.6 · PREMIUM</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="md:hidden inline-flex items-center justify-center h-8 w-8 rounded-lg border border-[var(--border)] bg-[rgba(255,255,255,0.65)] dark:bg-[rgba(25,30,50,0.65)] text-[var(--text-1)] shadow-sm hover:shadow-md transition"
            aria-label="Fechar menu lateral"
            title="Fechar"
          >
            ×
          </button>
        </div>

        <nav className="flex-1 px-4 py-5 space-y-1 overflow-y-auto" role="navigation" aria-label="Menu principal">
          {menu.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }: { isActive: boolean }) =>
                [
                  "block px-3 py-2 rounded-lg font-medium text-sm transition-all",
                  isActive
                    ? "bg-gradient-to-r from-[var(--brand-1)] to-[var(--brand-2)] text-white shadow-md"
                    : "text-[#1a1a1a] hover:text-[var(--brand-1)] hover:bg-[rgba(110,52,255,0.08)] dark:text-[#cfd3e8] dark:hover:text-white dark:hover:bg-[rgba(110,52,255,0.15)]",
                ].join(" ")
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-6 py-3 border-t border-[var(--border)] text-[11px] text-[var(--text-2)]">
          Glass Momentum v14.6
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
