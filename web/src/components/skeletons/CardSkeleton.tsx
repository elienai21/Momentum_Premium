// web/src/components/skeletons/CardSkeleton.tsx
interface CardSkeletonProps {
  lines?: number;
  compact?: boolean;
}

export function CardSkeleton({ lines = 3, compact }: CardSkeletonProps) {
  return (
    <div
      className={`bg-white rounded-xl border animate-pulse ${
        compact ? "p-3" : "p-6"
      }`}
    >
      <div className="h-4 w-28 bg-slate-200 rounded mb-4" />
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-3 bg-slate-200 rounded"
            style={{ width: `${70 + i * 10}%` }}
          />
        ))}
      </div>
    </div>
  );
}
