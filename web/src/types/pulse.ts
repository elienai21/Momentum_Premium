export type PulseSummary = {
  kpis: {
    cashBalance: number;
    revenueMonth: number;
    expenseMonth: number;
    runwayMonths: number;
    delta7d: { cash: number; revenue: number; expense: number };
  };
  insight: {
    headline: string;
    explain?: string;
  };
  meta: {
    tenantId: string;
    lastComputedAt: string; // ISO
    source: "cfoNightly" | "onDemand";
  };
};
