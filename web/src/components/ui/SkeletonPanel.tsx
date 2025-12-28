import { cn } from "../../lib/utils";
import { GlassPanel } from "./GlassPanel";

interface SkeletonPanelProps {
    className?: string;
}

export function SkeletonPanel({ className }: SkeletonPanelProps) {
    return (
        <GlassPanel className={cn("animate-pulse bg-momentum-bg/50 border-white/5", className)}>
            <div className="h-full w-full opacity-50 min-h-[100px]" />
        </GlassPanel>
    )
}
