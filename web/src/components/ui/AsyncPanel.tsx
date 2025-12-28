import { ReactNode } from "react";
import { GlassPanel } from "./GlassPanel";
import { LoadingState } from "./LoadingState";
import { ErrorState } from "./ErrorState";
import { EmptyState } from "./EmptyState";
import { Skeleton } from "./Skeleton";

interface AsyncPanelProps {
    isLoading: boolean;
    error?: any;
    isEmpty?: boolean;
    onRetry?: () => void;
    emptyTitle?: string;
    emptyDescription?: string;
    emptyIcon?: ReactNode;
    children: ReactNode;
    loadingVariant?: 'spinner' | 'skeleton';
    className?: string;
}

export function AsyncPanel({
    isLoading,
    error,
    isEmpty,
    onRetry,
    emptyTitle,
    emptyDescription,
    emptyIcon,
    children,
    loadingVariant = 'skeleton',
    className
}: AsyncPanelProps) {
    if (isLoading) {
        return (
            <GlassPanel className={className}>
                {loadingVariant === 'skeleton' ? (
                    <div className="p-8 space-y-4">
                        <Skeleton className="h-8 w-1/3" />
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-32 w-full" />
                    </div>
                ) : (
                    <LoadingState />
                )}
            </GlassPanel>
        );
    }

    if (error) {
        return (
            <GlassPanel className={className}>
                <ErrorState
                    message={error?.message || "Ocorreu um erro ao carregar os dados."}
                    traceId={error?.traceId}
                    onRetry={onRetry}
                />
            </GlassPanel>
        );
    }

    if (isEmpty) {
        return (
            <GlassPanel className={className}>
                <EmptyState
                    icon={emptyIcon}
                    title={emptyTitle || "Nenhum dado encontrado"}
                    description={emptyDescription || "Não há itens para exibir no momento."}
                />
            </GlassPanel>
        );
    }

    return <>{children}</>;
}
