// web/src/components/AlertsBell.tsx
import { useState, useRef, useEffect } from "react";
import { Bell } from "lucide-react";
import { useAlerts } from "../hooks/useAlerts";
import { useToast } from "./Toast";

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
    <div className="relative">
      <button
        type="button"
        onClick={handleToggle}
        className="relative inline-flex items-center justify-center w-9 h-9 rounded-full
                   border border-slate-200 bg-white/80 hover:bg-slate-50
                   dark:border-slate-700 dark:bg-slate-900/80 dark:hover:bg-slate-800
                   text-slate-700 dark:text-slate-100 shadow-sm hover:shadow-md
                   transition-all duration-200"
        aria-label="Abrir alertas"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center
                       min-w-[16px] h-4 rounded-full bg-amber-500 text-[10px] font-semibold
                       text-white px-1 shadow-md"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 mt-2 w-80 max-h-96 overflow-auto rounded-2xl border
                     border-slate-200 bg-white/95 backdrop-blur-xl shadow-xl p-3
                     dark:border-slate-700 dark:bg-slate-900/95 z-50"
          role="dialog"
          aria-label="Lista de alertas"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              Alertas
            </h3>
            {isLoading && (
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Atualizando...
              </span>
            )}
          </div>

          {alerts.length === 0 && !isLoading && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Nenhum alerta por enquanto. Quando houver algo importante sobre seu
              fluxo de caixa ou saúde financeira, aparece aqui.
            </p>
          )}

          <ul className="space-y-2">
            {alerts.map((alert) => (
              <li
                key={alert.id}
                className={[
                  "rounded-xl border px-3 py-2 text-xs",
                  "transition-all duration-200",
                  alert.status === "unread"
                    ? "border-amber-300 bg-amber-50/80 dark:border-amber-500/60 dark:bg-amber-900/20"
                    : "border-slate-200 bg-white/80 dark:border-slate-700 dark:bg-slate-900/80",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800 dark:text-slate-100">
                        {alert.title}
                      </span>
                      {alert.severity === "high" && (
                        <span className="inline-flex items-center rounded-full bg-red-100 text-red-700
                                         dark:bg-red-900/40 dark:text-red-300 px-1.5 py-0.5 text-[10px] font-semibold">
                          Crítico
                        </span>
                      )}
                      {alert.severity === "medium" && (
                        <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-700
                                         dark:bg-amber-900/40 dark:text-amber-300 px-1.5 py-0.5 text-[10px] font-semibold">
                          Atenção
                        </span>
                      )}
                      {alert.severity === "low" && (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-700
                                         dark:bg-emerald-900/40 dark:text-emerald-300 px-1.5 py-0.5 text-[10px] font-semibold">
                          Info
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
                      {alert.message}
                    </p>
                    {alert.createdAt && (
                      <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                        {new Date(alert.createdAt).toLocaleString("pt-BR")}
                      </p>
                    )}
                  </div>

                  {alert.status === "unread" && (
                    <button
                      type="button"
                      onClick={() => handleMarkAsRead(alert.id)}
                      className="text-[10px] font-medium text-slate-500 hover:text-slate-800
                                 dark:text-slate-400 dark:hover:text-slate-100"
                    >
                      Marcar como lido
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
