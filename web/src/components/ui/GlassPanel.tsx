import { cn } from "../../lib/utils";

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
}

export function GlassPanel({ className, children, ...props }: GlassPanelProps) {
    return (
        <div
            className={cn(
                "bg-momentum-glass backdrop-blur-xl border border-white/50 shadow-sm rounded-xl overflow-hidden",
                "dark:bg-slate-900/60 dark:border-white/5",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}
