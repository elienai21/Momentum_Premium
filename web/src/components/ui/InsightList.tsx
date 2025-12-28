import { ReactNode } from "react";
import { cn } from "../../lib/utils";

interface InsightListProps {
    children: ReactNode;
    className?: string;
}

export function InsightList({ children, className }: InsightListProps) {
    return (
        <div className={cn("space-y-3", className)}>
            {children}
        </div>
    )
}
