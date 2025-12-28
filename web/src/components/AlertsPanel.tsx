// web/src/components/AlertsPanel.tsx
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import type { AlertItem } from "../services/AlertsApi";

interface AlertsPanelProps {
  alerts: AlertItem[];
  isLoading: boolean;
  error?: unknown;
  onClose: () => void;
  onMarkAsRead: (id: string) => Promise<void>;
}

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function severityIcon(severity: AlertItem["severity"]) {
  switch (severity) {
    case "high":
      return (
        <AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400 flex-shrink-0" />
      );
    case "medium":
      return (
        <AlertTriangle className="h-4 w-4 text-amber-500 dark:text-amber-400 flex-shrink-0" />
      );
    case "low":
    default:
      return (
        <Info className="h-4 w-4 text-sky-500 dark:text-sky-400 flex-shrink-0" />
      );
  }
}

function severityLabel(severity: AlertItem["severity"]) {
  switch (severity) {
    case "high":
      return "Crítico";
    case "medium":
      return "Importante";
    case "low":
    default:
      return "Informativo";
  }
}

export const AlertsPanel: React.FC<AlertsPanelProps> = ({
  alerts,
  isLoading,
  error,
  onClose,
  onMarkAsRead,
}) => {
  return (
    <div
      className="absolute right-0 mt-2 w-[320px] sm:w-[360px] rounded-2xl border border-slate-200/80 bg-white/95 shadow-2xl
                 dark:border-slate-700 dark:bg-slate-900/95 backdrop-blur-xl z-50"
      role="dialog"
      aria-label="Centro de alertas"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
            Alertas
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Mudanças importantes na saúde financeira aparecem aqui.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Fechar painel de alertas"
        >
          <X className="h-4 w-4 text-slate-500" />
        </button>
      </div>

      {/* Estados globais */}
      {isLoading && (
        <div className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
          Carregando alertas...
        </div>
      )}

      {error && !isLoading && (
        <div className="px-4 py-3 text-xs text-red-500 dark:text-red-400">
          Não foi possível carregar os alertas. Tente novamente mais tarde.
        </div>
      )}

      {!isLoading && !error && alerts.length === 0 && (
        <div className="px-4 py-6 text-xs text-slate-500 dark:text-slate-400">
          Nenhum alerta crítico no momento. Quando algo importante mudar na sua
          saúde financeira, você será avisado aqui.
        </div>
      )}

      {!isLoading && !error && alerts.length > 0 && (
        <div className="max-h-80 overflow-y-auto py-1">
          {alerts.map((alert) => {
            const isUnread = alert.status === "unread";

            return (
              <button
                key={alert.id}
                type="button"
                onClick={async () => {
                  if (isUnread) {
                    try {
                      await onMarkAsRead(alert.id);
                    } catch (err) {
                      // eslint-disable-next-line no-console
                      console.error("Erro ao marcar alerta como lido:", err);
                    }
                  }
                }}
                className={[
                  "w-full text-left px-4 py-3 flex items-start gap-3 transition-colors",
                  isUnread
                    ? "bg-slate-50/90 hover:bg-slate-100 dark:bg-slate-900/80 dark:hover:bg-slate-800/90"
                    : "hover:bg-slate-50 dark:hover:bg-slate-900/60",
                ].join(" ")}
              >
                {severityIcon(alert.severity)}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {alert.title}
                    </p>
                    {isUnread && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-px text-[10px] font-medium text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Novo
                      </span>
                    )}
                  </div>

                  <p className="mt-0.5 text-[11px] leading-snug text-slate-600 dark:text-slate-300 line-clamp-3">
                    {alert.message}
                  </p>

                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wide text-slate-400">
                      {severityLabel(alert.severity)}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {formatDate(alert.dateKey || alert.createdAt)}
                    </span>
                  </div>
                </div>

                {!isUnread && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
