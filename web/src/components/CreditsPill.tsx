// web/src/components/CreditsPill.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { useCredits } from "@/hooks/useCredits";
import { Zap } from "lucide-react";

/**
 * Pill component that displays available AI credits in the Topbar.
 * Clicking navigates to Settings billing tab.
 */
export const CreditsPill: React.FC = () => {
    const navigate = useNavigate();
    const { credits, isLoading, noCredits } = useCredits();

    const available = credits?.available ?? 0;

    const handleClick = () => {
        navigate("/settings?tab=billing");
    };

    // Determine color based on credit level
    const getColorClasses = () => {
        if (noCredits || available <= 0) {
            return "bg-error/10 text-error border-error/20";
        }
        if (available < 50) {
            return "bg-warning/10 text-warning border-warning/20";
        }
        return "bg-primary/10 text-primary border-primary/20";
    };

    return (
        <button
            onClick={handleClick}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-bold transition-all hover:scale-105 active:scale-95 shadow-sm font-display ${getColorClasses()}`}
            title="Créditos de IA disponíveis"
        >
            <Zap size={14} className={noCredits ? "fill-error/30" : "fill-primary/30"} />
            {isLoading ? (
                <span className="animate-pulse">...</span>
            ) : (
                <span>{available.toLocaleString("pt-BR")} créditos</span>
            )}
        </button>
    );
};

export default CreditsPill;
