import { LucideIcon } from "lucide-react";
import { GlassPanel } from "./GlassPanel";
import { Badge } from "./Badge";
import { cn } from "../../lib/utils";

interface StatsCardProps {
    label: string;
    value: string;
    icon: LucideIcon;
    trend?: {
        value: string;
        direction: 'up' | 'down' | 'neutral';
    };
    variant?: 'default' | 'success' | 'warn' | 'danger';
    className?: string;
}

export function StatsCard({ label, value, icon: Icon, trend, variant = 'default', className }: StatsCardProps) {
    const variantStyles = {
        default: "text-primary",
        success: "text-success",
        warn: "text-warning",
        danger: "text-error",
    };

    const bgIcons = {
        default: "account_balance_wallet",
        success: "payments",
        warn: "hourglass_bottom",
        danger: "credit_card_off",
    };

    const trendVariant = !trend ? 'neutral' :
        trend.direction === 'up' ? 'success' :
            trend.direction === 'down' ? 'danger' : 'neutral';

    return (
        <GlassPanel className={cn("p-6 rounded-xl group relative overflow-hidden hover:border-primary/50 transition-all shadow-sm border border-slate-100 dark:border-white/5", className)}>
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] dark:opacity-5 group-hover:opacity-10 transition-opacity">
                <span className="material-icons-round text-6xl text-slate-800 dark:text-white leading-none">{bgIcons[variant]}</span>
            </div>

            <div className="flex items-center gap-2 mb-2 relative z-10">
                <span className="material-icons-round text-slate-400 dark:text-slate-500 text-sm">{bgIcons[variant]}</span>
                <span className="text-sm font-medium text-slate-800 dark:text-slate-400 font-display uppercase tracking-wider">{label}</span>
            </div>

            <div className="relative z-10">
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-1 tracking-tight font-display leading-tight">{value}</h3>
                {trend && (
                    <div className={cn(
                        "flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full w-fit transition-colors",
                        trend.direction === 'up' ? "text-success bg-success/10" :
                            trend.direction === 'down' ? "text-error bg-error/10" :
                                "text-warning bg-warning/10"
                    )}>
                        <span className="material-icons-round text-[14px]">
                            {trend.direction === 'up' ? 'trending_up' : trend.direction === 'down' ? 'trending_down' : 'remove'}
                        </span>
                        <span>{trend.direction === 'up' ? '+' : ''}{trend.value}</span>
                    </div>
                )}
            </div>
        </GlassPanel>
    );
}
