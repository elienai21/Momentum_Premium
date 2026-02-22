import { ReactNode, isValidElement } from "react";
import { GlassPanel } from "./GlassPanel";
import { cn } from "../../lib/utils";

interface EmptyStateProps {
    icon?: React.ElementType | ReactNode;
    title: string;
    description: string;
    action?: ReactNode;
    actionLabel?: string;
    onActionClick?: () => void;
    className?: string;
    variant?: string;
}

export function EmptyState({ icon: Icon, title, description, action, actionLabel, onActionClick, className, variant }: EmptyStateProps) {
    const effectiveAction = action || (actionLabel && onActionClick && (
        <button onClick={onActionClick} className="bg-momentum-accent text-white px-4 py-2 rounded-lg text-sm">
            {actionLabel}
        </button>
    ));

    const IconComp = Icon as any;

    return (
        <GlassPanel className={cn("flex flex-col items-center justify-center text-center p-8 min-h-[200px]", className)}>
            {Icon && (
                <div className="mb-4 text-momentum-muted opacity-50 text-4xl flex items-center justify-center p-4 bg-momentum-bg/50 rounded-full">
                    {isValidElement(Icon) ? Icon : typeof Icon === 'string' ? Icon : IconComp && <IconComp className="w-8 h-8" />}
                </div>
            )}
            <h3 className="text-lg font-semibold text-momentum-text dark:text-white mb-2">{title}</h3>
            <p className="text-sm text-momentum-muted max-w-sm mb-6 leading-relaxed">{description}</p>
            {effectiveAction && (
                <div className="mt-2">
                    {effectiveAction}
                </div>
            )}
        </GlassPanel>
    )
}
