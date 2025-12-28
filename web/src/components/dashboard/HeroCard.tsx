import React, { ReactNode } from "react";
import { GlassPanel } from "../ui/GlassPanel";
import { StatsCard } from "../ui/StatsCard";
import { cn } from "../../lib/utils";

interface HeroCardProps {
    title: string;
    description: string;
    badge?: ReactNode;
    mainKpiLabel: string;
    mainKpiValue: string;
    miniStats: Array<{
        label: string;
        value: string;
        icon: any;
        variant?: "default" | "success" | "warn" | "danger";
    }>;
    actions?: ReactNode;
    className?: string;
}

export function HeroCard({
    title,
    description,
    badge,
    mainKpiLabel,
    mainKpiValue,
    miniStats,
    actions,
    className,
}: HeroCardProps) {
    return (
        <section className={cn("relative overflow-hidden rounded-2xl border border-momentum-border group transition-all duration-500 hover:border-momentum-accent/30 shadow-xl", className)}>
            {/* Background Gradient & Effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-momentum-accent/15 via-transparent to-momentum-secondary/5 z-0" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-momentum-accent/10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-momentum-accent/20 transition-all duration-700" />

            <GlassPanel className="relative z-10 border-0 bg-transparent flex flex-col lg:flex-row gap-8 p-8 h-full">
                {/* Left Side: Branding & Main KPI */}
                <div className="flex-1 flex flex-col justify-between space-y-6">
                    <div className="space-y-4">
                        {badge && <div className="flex">{badge}</div>}
                        <div className="space-y-2">
                            <h2 className="text-3xl font-bold font-display text-momentum-text dark:text-white tracking-tight leading-tight">
                                {title}
                            </h2>
                            <p className="text-momentum-muted text-sm leading-relaxed max-w-md">
                                {description}
                            </p>
                        </div>
                    </div>

                    <div className="pt-4">
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-momentum-accent uppercase tracking-widest">{mainKpiLabel}</p>
                            <p className="text-4xl font-black text-momentum-text dark:text-white font-display">
                                {mainKpiValue}
                            </p>
                        </div>
                        {actions && <div className="mt-8 flex gap-4">{actions}</div>}
                    </div>
                </div>

                {/* Right Side: Mini Stats Grid */}
                <div className="lg:w-80 flex flex-col gap-4">
                    <p className="text-[10px] font-bold text-momentum-muted uppercase tracking-[0.2em] mb-1">Métricas Rápidas</p>
                    <div className="grid grid-cols-1 gap-3">
                        {miniStats.map((stat, i) => (
                            <StatsCard
                                key={i}
                                label={stat.label}
                                value={stat.value}
                                icon={stat.icon}
                                variant={stat.variant}
                                className="py-3 px-4 bg-white/40 dark:bg-black/20 backdrop-blur-sm border-white/20 dark:border-white/5 hover:-translate-y-1 transition-transform"
                            />
                        ))}
                    </div>
                </div>
            </GlassPanel>
        </section>
    );
}
