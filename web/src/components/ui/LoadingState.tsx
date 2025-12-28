import { Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";

interface LoadingStateProps {
    message?: string;
    className?: string;
}

export function LoadingState({ message = "Carregando...", className }: LoadingStateProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center p-12 space-y-4", className)}>
            <Loader2 className="h-8 w-8 animate-spin text-momentum-accent" />
            <p className="text-sm text-momentum-muted animate-pulse font-medium">{message}</p>
        </div>
    );
}
