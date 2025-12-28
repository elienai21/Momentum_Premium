import { AlertCircle, RotateCcw } from "lucide-react";
import { cn } from "../../lib/utils";

interface ErrorStateProps {
    title?: string;
    message: string;
    traceId?: string;
    onRetry?: () => void;
    className?: string;
}

export function ErrorState({
    title = "Ops! Algo deu errado",
    message,
    traceId,
    onRetry,
    className
}: ErrorStateProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center p-12 text-center", className)}>
            <div className="p-4 bg-momentum-danger/10 rounded-full mb-6">
                <AlertCircle className="h-10 w-10 text-momentum-danger" />
            </div>
            <h3 className="text-xl font-bold text-momentum-text dark:text-white mb-2">{title}</h3>
            <p className="text-sm text-momentum-muted max-w-sm mb-6 leading-relaxed">{message}</p>

            {traceId && (
                <div className="mb-8 px-3 py-1 bg-momentum-muted/5 border border-momentum-border rounded text-[10px] font-mono text-momentum-muted/60">
                    ID do erro: {traceId}
                </div>
            )}

            {onRetry && (
                <button
                    onClick={onRetry}
                    className="flex items-center gap-2 px-6 py-2.5 bg-momentum-accent hover:bg-momentum-accent/90 text-white rounded-lg text-sm font-semibold transition-all shadow-momentum-glow"
                >
                    <RotateCcw size={18} /> Tentar novamente
                </button>
            )}
        </div>
    );
}
