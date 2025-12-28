export function KpiSkeleton() {
  return (
    <div
      className="p-4 bg-white rounded-xl border animate-pulse"
      data-testid="kpi-skeleton"
    >
      <div className="h-3 w-20 bg-slate-200 rounded mb-3" />
      <div className="h-7 w-24 bg-slate-200 rounded mb-1" />
      <div className="h-3 w-16 bg-slate-100 rounded" />
    </div>
  );
}
