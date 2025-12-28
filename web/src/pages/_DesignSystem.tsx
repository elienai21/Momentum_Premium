
import { Wallet, AlertTriangle, CheckCircle, AlertCircle, FileSearch, Loader2, RotateCcw } from "lucide-react";
import { GlassPanel } from "../components/ui/GlassPanel";
import { SectionHeader } from "../components/ui/SectionHeader";
import { StatsCard } from "../components/ui/StatsCard";
import { Badge } from "../components/ui/Badge";
import { InsightCard } from "../components/ui/InsightCard";
import { InsightList } from "../components/ui/InsightList";
import { SkeletonPanel } from "../components/ui/SkeletonPanel";
import { EmptyState } from "../components/ui/EmptyState";
import { LoadingState } from "../components/ui/LoadingState";
import { ErrorState } from "../components/ui/ErrorState";
import { Skeleton } from "../components/ui/Skeleton";
import { AsyncPanel } from "../components/ui/AsyncPanel";

export default function DesignSystemPage() {
    return (
        <div className="min-h-screen bg-momentum-bg p-8 space-y-12 pb-24">
            <SectionHeader
                title="Momentum Design System"
                subtitle="Visual Validation Playground (DEV ONLY)"
            />

            <section className="space-y-4">
                <h3 className="text-lg font-semibold text-momentum-text">Colors & Tokens</h3>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    <div className="h-16 rounded bg-momentum-accent flex items-center justify-center text-white text-xs">Accent</div>
                    <div className="h-16 rounded bg-momentum-secondary flex items-center justify-center text-white text-xs">Secondary</div>
                    <div className="h-16 rounded bg-momentum-success flex items-center justify-center text-white text-xs">Success</div>
                    <div className="h-16 rounded bg-momentum-warn flex items-center justify-center text-white text-xs">Warn</div>
                    <div className="h-16 rounded bg-momentum-danger flex items-center justify-center text-white text-xs">Danger</div>
                    <div className="h-16 rounded bg-momentum-glass border border-momentum-border flex items-center justify-center text-momentum-text text-xs">Glass</div>
                </div>
            </section>

            <section className="space-y-4">
                <h3 className="text-lg font-semibold text-momentum-text">Primitives</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <GlassPanel className="p-6">
                        <p className="text-momentum-text font-display">This is a GlassPanel content with Font Display.</p>
                    </GlassPanel>

                    <div className="space-y-2">
                        <div className="flex gap-2">
                            <Badge variant="success">Success Badge</Badge>
                            <Badge variant="warn">Warn Badge</Badge>
                        </div>
                        <div className="flex gap-2">
                            <Badge variant="danger">Danger Badge</Badge>
                            <Badge variant="neutral">Neutral Badge</Badge>
                        </div>
                    </div>
                </div>
            </section>

            <section className="space-y-4">
                <h3 className="text-lg font-semibold text-momentum-text">Stats Cards</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <StatsCard
                        label="Total Revenue"
                        value="R$ 1.2M"
                        icon={Wallet}
                        trend={{ value: "+12%", direction: "up" }}
                        variant="default"
                    />
                    <StatsCard
                        label="Active Issues"
                        value="3"
                        icon={AlertTriangle}
                        trend={{ value: "+1", direction: "up" }}
                        variant="danger"
                    />
                    <StatsCard
                        label="Tasks Done"
                        value="156"
                        icon={CheckCircle}
                        trend={{ value: "Stable", direction: "neutral" }}
                        variant="success"
                    />
                </div>
            </section>

            <section className="space-y-4">
                <h3 className="text-lg font-semibold text-momentum-text">Async States & Infrastructure</h3>
                <p className="text-sm text-momentum-muted mb-4">Standardized states for loading, errors, and empty results.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-4">
                        <p className="text-xs font-bold text-momentum-accent uppercase tracking-widest">Loading State</p>
                        <GlassPanel className="p-4">
                            <LoadingState message="Buscando transações..." />
                        </GlassPanel>
                    </div>

                    <div className="space-y-4">
                        <p className="text-xs font-bold text-momentum-accent uppercase tracking-widest">Error State</p>
                        <GlassPanel className="p-0">
                            <ErrorState
                                message="Não foi possível conectar ao servidor. Verifique sua conexão."
                                onRetry={() => alert('Retry clicked')}
                                traceId="req_982341"
                            />
                        </GlassPanel>
                    </div>

                    <div className="space-y-4">
                        <p className="text-xs font-bold text-momentum-accent uppercase tracking-widest">Skeleton Blocks</p>
                        <div className="space-y-3">
                            <Skeleton className="h-6 w-2/3" />
                            <Skeleton className="h-20 w-full" />
                            <div className="flex gap-2 mt-4">
                                <Skeleton className="h-8 w-20 rounded-full" />
                                <Skeleton className="h-8 w-20 rounded-full" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
                    <div className="space-y-4">
                        <p className="text-xs font-bold text-momentum-accent uppercase tracking-widest">AsyncPanel Wrapper (Skeleton View)</p>
                        <AsyncPanel
                            isLoading={true}
                            loadingVariant="skeleton"
                            className="h-80"
                        >
                            <div>Real Content Hidden</div>
                        </AsyncPanel>
                    </div>
                    <div className="space-y-4">
                        <p className="text-xs font-bold text-momentum-accent uppercase tracking-widest">AsyncPanel (Empty View)</p>
                        <AsyncPanel
                            isLoading={false}
                            isEmpty={true}
                            emptyTitle="Nenhum plano encontrado"
                            emptyDescription="Crie seu primeiro plano de investimento para começar."
                            className="h-80"
                        >
                            <div>Real Content Hidden</div>
                        </AsyncPanel>
                    </div>
                </div>
            </section>

            <section className="space-y-4">
                <h3 className="text-lg font-semibold text-momentum-text">Insight Blocks</h3>
                <p className="text-sm text-momentum-muted mb-4">UI primitives for displaying analysis and automated insights.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InsightList>
                        <InsightCard
                            title="Despesas Elevadas"
                            description="Sua categoria 'Marketing' está 20% acima da média histórica."
                            severity="warn"
                        />
                        <InsightCard
                            title="Oportunidade de Receita"
                            description="Clientes inativos há 60 dias podem ser reativados com campanha de e-mail."
                            severity="info"
                            actions={<button className="text-xs text-momentum-accent font-medium hover:underline">Ver Clientes Inativos</button>}
                        />
                        <InsightCard
                            title="Saúde Financeira"
                            description="Seu runway está em níveis ótimos (> 12 meses)."
                            severity="success"
                        />
                    </InsightList>

                    <div className="space-y-4">
                        <div>
                            <p className="text-xs text-momentum-muted mb-2">Skeleton Panel (Classic):</p>
                            <SkeletonPanel className="h-32" />
                        </div>
                        <div>
                            <p className="text-xs text-momentum-muted mb-2">Empty State (Classic):</p>
                            <EmptyState
                                icon={<FileSearch size={32} />}
                                title="Nenhum dado encontrado"
                                description="Experimente ajustar os filtros ou selecionar outro período."
                                action={<button className="px-4 py-2 bg-momentum-accent text-white rounded-lg text-xs font-medium">Limpar Filtros</button>}
                            />
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
