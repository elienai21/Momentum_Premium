import { useEffect, useMemo, useState } from "react";
import { realEstateApi, OwnerStatement } from "../../services/realEstateApi";
import { GlassPanel } from "../ui/GlassPanel";
import { Badge } from "../ui/Badge";
import { Loader2, FileText, Download } from "lucide-react";

type Props = {
  ownerId: string;
};

const currency = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

export function StatementsPanel({ ownerId }: Props) {
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [statements, setStatements] = useState<OwnerStatement[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const monthLabel = useMemo(() => {
    const [year, month] = period.split("-");
    return `${month}/${year}`;
  }, [period]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await realEstateApi.financial.listStatements(ownerId);
      setStatements(data);
    } catch (err: any) {
      setError(err?.message || "Erro ao carregar extratos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ownerId) {
      load();
    }
  }, [ownerId]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await realEstateApi.financial.generateStatement(ownerId, period);
      if (res?.statement) {
        setStatements((prev) => [res.statement, ...prev.filter((s) => s.id !== res.statement.id)]);
      }
    } catch (err: any) {
      setError(err?.message || "Erro ao gerar extrato");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <GlassPanel className="p-4 border border-slate-200/70 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase text-slate-400 font-semibold tracking-widest">
            Extratos
          </p>
          <h4 className="text-lg font-bold text-slate-800">Prestação de Contas</h4>
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
            disabled={generating}
          >
            {generating && <Loader2 className="h-4 w-4 animate-spin" />}
            Gerar
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          Carregando extratos...
        </div>
      )}

      {!loading && !error && statements.length === 0 && (
        <p className="text-sm text-slate-500">Nenhum extrato gerado para este proprietário.</p>
      )}

      <div className="space-y-3">
        {statements.map((st) => (
          <div
            key={st.id}
            className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-white"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <FileText size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-800">{st.period}</p>
                  <Badge variant={st.status === "ready" ? "success" : "warn"}>
                    {st.status === "ready" ? "Pronto" : "Falhou"}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500">
                  Repasse líquido: {currency(st.totals.net || 0)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="neutral" className="text-[10px]">
                {st.generatedAt?.slice(0, 10) || monthLabel}
              </Badge>
              <a
                href={st.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm font-semibold ${
                  st.htmlUrl
                    ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    : "border-slate-200 text-slate-400 cursor-not-allowed"
                }`}
                onClick={(e) => {
                  if (!st.htmlUrl) {
                    e.preventDefault();
                  }
                }}
              >
                <Download size={14} />
                Ver/Imprimir
              </a>
            </div>
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}
