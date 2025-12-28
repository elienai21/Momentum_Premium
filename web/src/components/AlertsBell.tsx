// web/src/components/AlertsBell.tsx
import { useState, useRef, useEffect } from "react";
import { Bell } from "lucide-react";
import { useAlerts } from "../hooks/useAlerts";
import { useToast } from "./Toast";
import { AlertsPanel } from "./AlertsPanel";

export function AlertsBell() {
  const { data, isLoading, error, unreadCount, markAsRead } = useAlerts();
  const alerts = data ?? [];
  const { notify } = useToast();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Fecha painel ao clicar fora
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  useEffect(() => {
    if (error) {
      notify({
        type: "error",
        message:
          "Não foi possível carregar seus alertas agora. Tente novamente mais tarde.",
      });
    }
  }, [error, notify]);

  const handleToggle = () => {
    setOpen((prev) => !prev);
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead(id);
    } catch {
      notify({
        type: "error",
        message: "Erro ao marcar alerta como lido. Tente novamente.",
      });
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={handleToggle}
        className="relative inline-flex items-center justify-center w-10 h-10 rounded-xl
                   border border-momentum-border bg-white/50 hover:bg-white
                   dark:bg-momentum-bg/50 dark:hover:bg-momentum-bg
                   text-momentum-text shadow-sm hover:shadow-md
                   transition-all duration-200 group"
        aria-label="Abrir alertas"
      >
        <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 inline-flex items-center justify-center
                       min-w-[18px] h-[18px] rounded-full bg-momentum-accent text-[10px] font-bold
                       text-white px-1 shadow-momentum-glow animate-pulse"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <AlertsPanel
          alerts={alerts}
          isLoading={isLoading}
          error={error}
          onClose={() => setOpen(false)}
          onMarkAsRead={handleMarkAsRead}
        />
      )}
    </div>
  );
}
