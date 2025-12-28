import { cn } from "../../lib/utils";

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
}

export function GlassPanel({ className, children, ...props }: GlassPanelProps) {
    return (
        <div
            className={cn(
                "glass shadow-sm rounded-xl overflow-hidden",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}
