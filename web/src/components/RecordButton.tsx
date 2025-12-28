import { Mic, Square } from "lucide-react";

type Props = { recording?: boolean; onStart?: () => void; onStop?: () => void };
export default function RecordButton({ recording, onStart, onStop }: Props) {
  return recording ? (
    <button
      onClick={onStop}
      className="inline-flex items-center gap-2 rounded-xl bg-rose-600 text-white px-3 py-2 text-sm hover:bg-rose-700"
    >
      <Square className="h-4 w-4" /> Parar
    </button>
  ) : (
    <button
      onClick={onStart}
      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 text-white px-3 py-2 text-sm hover:bg-emerald-700"
    >
      <Mic className="h-4 w-4" /> Gravar
    </button>
  );
}
