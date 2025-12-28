import { ReactNode } from "react";
import { GlassPanel } from "./GlassPanel";
import { cn } from "../../lib/utils";

interface InsightCardProps {
    title: string;
    description: string;
    severity?: 'info' | 'warn' | 'success' | 'danger';
    actions?: ReactNode;
    className?: string;
}

export function InsightCard({ title, description, severity = 'info', actions, className }: InsightCardProps) {
    const severityColors = {
        info: "text-momentum-secondary bg-momentum-secondary/10 border-momentum-secondary/20",
        warn: "text-momentum-warn bg-momentum-warn/10 border-momentum-warn/20",
        success: "text-momentum-success bg-momentum-success/10 border-momentum-success/20",
        danger: "text-momentum-danger bg-momentum-danger/10 border-momentum-danger/20",
    };

    return (
        <GlassPanel className={cn("p-4 flex flex-col gap-3 transition-colors hover:border-momentum-accent/30", className)}>
            <div className="flex justify-between items-start gap-4">
                <div className="space-y-1 w-full">
                    <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm text-momentum-text dark:text-white">{title}</h4>
                        <span className={cn("text-[10px] px-2 py-0.5 rounded border uppercase font-bold tracking-wider", severityColors[severity])}>
                            {severity}
                        </span>
                    </div>
                    <p className="text-xs text-momentum-muted leading-relaxed pr-8">{description}</p>
                </div>
            </div>
            {actions && <div className="flex gap-2 pt-1 border-t border-momentum-border/50 mt-1">{actions}</div>}
        </GlassPanel>
    )
}
