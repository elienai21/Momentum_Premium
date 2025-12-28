// web/src/components/AlertsPanel.tsx
import { X, CheckCheck, ExternalLink } from "lucide-react";
import type { AlertItem } from "../services/AlertsApi";
import { InsightCard } from "./ui/InsightCard";
import { InsightList } from "./ui/InsightList";
import { EmptyState } from "./ui/EmptyState";
import { SkeletonPanel } from "./ui/SkeletonPanel";
import { useNavigate } from "react-router-dom";
import { GlassPanel } from "./ui/GlassPanel";
import { Badge } from "./ui/Badge";
import { cn } from "../lib/utils";

interface AlertsPanelProps {
  alerts: AlertItem[];
  isLoading: boolean;
  error?: unknown;
  onClose: () => void;
  onMarkAsRead: (id: string) => Promise<void>;
}

export const AlertsPanel: React.FC<AlertsPanelProps> = ({
  alerts,
  isLoading,
  error,
  onClose,
  onMarkAsRead,
}) => {
  const navigate = useNavigate();
  const unreadAlerts = alerts.filter(a => a.status === 'unread');

  const getSeverityVariant = (severity: string) => {
    switch (severity) {
      case "high": return "danger";
      case "medium": return "warn";
      default: return "info";
    }
  };

  const handleGoToCenter = () => {
    navigate('/alerts');
    onClose();
  };

  return (
    <GlassPanel
      className="absolute right-0 mt-3 w-80 sm:w-96 p-0 overflow-hidden shadow-2xl z-50 border-momentum-accent/20"
      role="dialog"
      aria-label="Centro de alertas rápido"
    >
      <div className="flex items-center justify-between p-4 border-b border-momentum-border bg-momentum-bg/20">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-momentum-accent">
            Alertas
          </p>
          <p className="text-[10px] text-momentum-muted">
            {unreadAlerts.length} novas notificações
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-momentum-bg/50 text-momentum-muted transition-colors"
          aria-label="Fechar"
        >
          <X size={16} />
        </button>
      </div>

      <div className="max-h-[28rem] overflow-y-auto p-4 custom-scrollbar">
        {isLoading ? (
          <InsightList>
            {[1, 2, 3].map(i => <SkeletonPanel key={i} className="h-20" />)}
          </InsightList>
        ) : error ? (
          <EmptyState
            title="Erro"
            description="Falha ao carregar alertas."
            className="min-h-0 py-6"
          />
        ) : alerts.length === 0 ? (
          <EmptyState
            title="Tudo limpo"
            description="Nenhum alerta pendente."
            className="min-h-0 py-8"
          />
        ) : (
          <InsightList>
            {alerts.slice(0, 5).map((alert) => (
              <InsightCard
                key={alert.id}
                title={alert.title}
                description={alert.message}
                severity={getSeverityVariant(alert.severity) as any}
                className={cn(
                  "p-3 text-[11px]",
                  alert.status === 'read' && "opacity-50 saturate-0"
                )}
                actions={
                  alert.status === 'unread' ? (
                    <button
                      onClick={() => onMarkAsRead(alert.id)}
                      className="text-[9px] font-bold text-momentum-accent hover:underline uppercase"
                    >
                      Marcar como lido
                    </button>
                  ) : undefined
                }
              />
            ))}
          </InsightList>
        )}
      </div>

      <div className="p-3 border-t border-momentum-border bg-momentum-bg/30">
        <button
          onClick={handleGoToCenter}
          className="w-full py-2 rounded-lg bg-momentum-accent/10 hover:bg-momentum-accent/20 text-momentum-accent text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
        >
          Ver todos no Centro de Alertas <ExternalLink size={12} />
        </button>
      </div>
    </GlassPanel>
  );
};
