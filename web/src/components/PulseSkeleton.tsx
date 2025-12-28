// src/components/PulseSkeleton.tsx
export default function PulseSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-6 w-56 bg-slate-200 rounded" />
          <div className="h-4 w-72 bg-slate-200 rounded mt-2" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-36 bg-slate-200 rounded-xl" />
          <div className="h-9 w-40 bg-slate-200 rounded-xl" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-2xl border p-5">
            <div className="h-4 w-24 bg-slate-200 rounded" />
            <div className="h-7 w-32 bg-slate-200 rounded mt-3" />
            <div className="h-3 w-16 bg-slate-200 rounded mt-2" />
          </div>
        ))}
      </div>

      <div className="rounded-2xl border p-5">
        <div className="h-5 w-3/4 bg-slate-200 rounded" />
        <div className="h-4 w-1/2 bg-slate-200 rounded mt-2" />
      </div>
    </div>
  );
}
