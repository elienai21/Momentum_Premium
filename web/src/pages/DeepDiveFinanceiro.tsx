import React from "react";
import { SectionHeader } from "../components/ui/SectionHeader";

export default function DeepDiveFinanceiro() {
    return (
        <div className="space-y-8 p-8">
            <SectionHeader title="Deep Dive Financeiro" subtitle="Análise detalhada de fluxo de caixa e anomalias." />
            <div className="p-12 border border-dashed border-momentum-border rounded-xl flex items-center justify-center text-momentum-muted">
                Em construção...
            </div>
        </div>
    );
}
