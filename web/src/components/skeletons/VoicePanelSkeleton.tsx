// web/src/components/skeletons/VoicePanelSkeleton.tsx
export function VoicePanelSkeleton() {
  return (
    <div className="bg-white rounded-2xl border p-4 shadow-sm animate-pulse flex flex-col gap-3">
      <div className="h-4 w-40 bg-slate-200 rounded" />
      <div className="h-3 w-32 bg-slate-100 rounded" />
      <div className="h-24 bg-slate-100 rounded-lg" />
      <div className="flex gap-2">
        <div className="h-9 flex-1 bg-slate-100 rounded-xl" />
        <div className="h-9 w-20 bg-slate-200 rounded-xl" />
      </div>
    </div>
  );
}
