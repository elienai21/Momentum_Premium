import { ReactNode } from "react";
import { GlassPanel } from "./GlassPanel";
import { cn } from "../../lib/utils";

interface EmptyStateProps {
    icon?: ReactNode;
    title: string;
    description: string;
    action?: ReactNode;
    className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
    return (
        <GlassPanel className={cn("flex flex-col items-center justify-center text-center p-8 min-h-[200px]", className)}>
            {icon && (
                <div className="mb-4 text-momentum-muted opacity-50 text-4xl flex items-center justify-center p-4 bg-momentum-bg/50 rounded-full">
                    {icon}
                </div>
            )}
            <h3 className="text-lg font-semibold text-momentum-text dark:text-white mb-2">{title}</h3>
            <p className="text-sm text-momentum-muted max-w-sm mb-6 leading-relaxed">{description}</p>
            {action && (
                <div className="mt-2">
                    {action}
                </div>
            )}
        </GlassPanel>
    )
}
