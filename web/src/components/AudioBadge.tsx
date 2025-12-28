type Props = { playing?: boolean; label?: string };
export default function AudioBadge({ playing, label = "Tocando" }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs ${
        playing
          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-50 text-slate-600"
      }`}
    >
      <span className="h-2 w-2 rounded-full animate-pulse bg-current" aria-hidden />
      {playing ? label : "Pronto"}
    </span>
  );
}
