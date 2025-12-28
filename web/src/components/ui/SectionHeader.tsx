import { cn } from "../../lib/utils";

interface SectionHeaderProps {
    title: string;
    subtitle?: string;
    actions?: React.ReactNode;
    className?: string;
}

export function SectionHeader({ title, subtitle, actions, className }: SectionHeaderProps) {
    return (
        <div className={cn("flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6", className)}>
            <div>
                <h2 className="text-2xl font-bold text-momentum-text dark:text-white">{title}</h2>
                {subtitle && <p className="text-momentum-muted mt-1">{subtitle}</p>}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
    );
}
