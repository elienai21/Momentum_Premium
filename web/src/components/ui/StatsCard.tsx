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
        default: "text-momentum-accent",
        success: "text-momentum-success",
        warn: "text-momentum-warn",
        danger: "text-momentum-danger",
    };

    const trendVariant = !trend ? 'neutral' :
        trend.direction === 'up' ? 'success' :
            trend.direction === 'down' ? 'danger' : 'neutral';

    return (
        <GlassPanel className={cn("p-6 flex flex-col justify-between group hover:border-momentum-accent/50 transition-colors", className)}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-momentum-muted">
                    <Icon size={18} />
                    <span className="text-sm font-medium">{label}</span>
                </div>
                <div className={cn("p-2 rounded-lg bg-current/5 opacity-50 group-hover:opacity-100 transition-opacity", variantStyles[variant])}>
                    <Icon size={24} className={variantStyles[variant]} />
                </div>
            </div>
            <div>
                <h3 className="text-2xl font-bold text-momentum-text dark:text-white mb-1">{value}</h3>
                {trend && (
                    <Badge variant={trendVariant}>
                        {trend.value}
                    </Badge>
                )}
            </div>
        </GlassPanel>
    );
}
