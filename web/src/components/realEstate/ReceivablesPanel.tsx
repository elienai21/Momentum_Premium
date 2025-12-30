import { useEffect, useMemo, useState } from "react";
import { realEstateApi, Receivable, AgingSnapshot } from "../../services/realEstateApi";
import { GlassPanel } from "../ui/GlassPanel";
import { Badge } from "../ui/Badge";
import { Loader2, DollarSign, AlertTriangle, CheckCircle, Clock, Download } from "lucide-react";

type Props = {
  unitId?: string;
  ownerId?: string;
};

const currency = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

function AgingCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className={`p-3 rounded-xl border ${color} bg-white`}>
      <p className="text-[11px] uppercase text-slate-400 font-semibold tracking-widest">{label}</p>
      <p className="text-lg font-bold text-slate-800">{currency(value)}</p>
    </div>
  );
}

export function ReceivablesPanel({ unitId, ownerId }: Props) {
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [aging, setAging] = useState<AgingSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingAging, setLoadingAging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [processing, setProcessing] = useState(false);

  const filters = useMemo(() => {
    const f: any = {};
    if (unitId) f.unitId = unitId;
    if (ownerId) f.ownerId = ownerId;
    return f;
  }, [unitId, ownerId]);

  const loadReceivables = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await realEstateApi.receivables.list(filters);
      setReceivables(data);
    } catch (err: any) {
      setError(err?.message || "Erro ao carregar cobranças");
    } finally {
      setLoading(false);
    }
  };

  const loadAging = async () => {
    setLoadingAging(true);
    try {
      const data = await realEstateApi.analytics.getAging();
      setAging(data);
    } catch (err) {
      // ignore for now
    } finally {
      setLoadingAging(false);
    }
  };

  useEffect(() => {
    loadReceivables();
    loadAging();
  }, [filters]);

  const handleGenerate = async () => {
    setProcessing(true);
    setError(null);
    try {
      await realEstateApi.receivables.generateBatch(period);
      await loadReceivables();
      await loadAging();
    } catch (err: any) {
      setError(err?.message || "Erro ao gerar cobranças");
    } finally {
      setProcessing(false);
    }
  };

  const handlePayment = async (id: string) => {
    const valueStr = window.prompt("Valor pago (ex: 1200.00):");
    if (!valueStr) return;
    const amount = Number(valueStr);
    if (Number.isNaN(amount) || amount <= 0) return;
    const date = window.prompt("Data do pagamento (YYYY-MM-DD):", new Date().toISOString().slice(0, 10));
    if (!date) return;
    setProcessing(true);
    try {
      const updated = await realEstateApi.receivables.recordPayment(id, amount, date);
      setReceivables((prev) => prev.map((r) => (r.id === id ? updated : r)));
      await loadAging();
    } catch (err: any) {
      setError(err?.message || "Erro ao registrar pagamento");
    } finally {
      setProcessing(false);
    }
  };

  const kpiBuckets = aging?.buckets;

  return (
    <GlassPanel className="p-4 border border-slate-200/70 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase text-slate-400 font-semibold tracking-widest">
            Recebíveis
          </p>
          <h4 className="text-lg font-bold text-slate-800">Contas a Receber</h4>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <button
            onClick={handleGenerate}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold shadow-sm hover:bg-blue-700 disabled:opacity-60 inline-flex items-center gap-2"
            disabled={processing}
          >
            {processing && <Loader2 className="h-4 w-4 animate-spin" />}
            Gerar Cobranças do Mês
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <AgingCard label="0-30 dias" value={kpiBuckets?.d0_30.total || 0} color="border-emerald-100" />
        <AgingCard label="31-60 dias" value={kpiBuckets?.d31_60.total || 0} color="border-amber-100" />
        <AgingCard label="61-90 dias" value={kpiBuckets?.d61_90.total || 0} color="border-orange-100" />
        <AgingCard label="> 90 dias" value={kpiBuckets?.d90_plus.total || 0} color="border-red-100" />
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          Carregando cobranças...
        </div>
      )}

      {!loading && receivables.length === 0 && (
        <p className="text-sm text-slate-500">Nenhuma cobrança encontrada.</p>
      )}

      <div className="space-y-2">
        {receivables.map((rec) => (
          <div
            key={rec.id}
            className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-white"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                <DollarSign size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-800">{rec.unitId}</p>
                  <Badge
                    variant={
                      rec.status === "paid"
                        ? "success"
                        : rec.status === "partial"
                        ? "warn"
                        : "neutral"
                    }
                  >
                    {rec.status}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500">
                  Vencimento: {rec.dueDate} • Valor: {currency(rec.amount)} • Pago:{" "}
                  {currency(rec.amountPaid || 0)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="neutral" className="text-[10px]">
                {rec.period}
              </Badge>
              <button
                onClick={() => handlePayment(rec.id)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-blue-200 text-blue-700 text-sm font-semibold hover:bg-blue-50 disabled:opacity-60"
                disabled={processing}
              >
                <CheckCircle size={14} />
                Baixar
              </button>
            </div>
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}
