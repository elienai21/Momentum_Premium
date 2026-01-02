import React from "react";
import AdvisorChat from "../components/AdvisorChat";
import { SectionHeader } from "../components/ui/SectionHeader";
import { GlassPanel } from "../components/ui/GlassPanel";
import { Sparkles } from "lucide-react";
import { useTenant } from "@/context/TenantContext";

const Insights: React.FC = () => {
  const { tenantId } = useTenant();
  return (
    <div className="space-y-8 pb-20 fade-in">
      <SectionHeader
        title={
          <div className="flex items-center gap-2">
            <Sparkles size={24} className="text-momentum-accent" />
            <span>Consultoria Estratégica</span>
          </div>
        }
        subtitle="Análise profunda de dados e aconselhamento financeiro via IA."
      />

      <GlassPanel className="p-0 overflow-hidden min-h-[calc(100vh-280px)] border-none shadow-2xl">
        <AdvisorChat tenantId={tenantId} />
      </GlassPanel>
    </div>
  );
};

export default Insights;
