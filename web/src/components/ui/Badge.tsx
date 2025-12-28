import { cn } from "../../lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: 'success' | 'warn' | 'danger' | 'neutral';
    children: React.ReactNode;
}

export function Badge({ variant = 'neutral', className, children, ...props }: BadgeProps) {
    const variants = {
        success: "bg-momentum-success/10 text-momentum-success border-momentum-success/20",
        warn: "bg-momentum-warn/10 text-momentum-warn border-momentum-warn/20",
        danger: "bg-momentum-danger/10 text-momentum-danger border-momentum-danger/20",
        neutral: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
    };

    return (
        <span
            className={cn(
                "px-2.5 py-0.5 rounded-full text-xs font-medium border flex items-center gap-1 w-fit",
                variants[variant],
                className
            )}
            {...props}
        >
            {children}
        </span>
    );
}
