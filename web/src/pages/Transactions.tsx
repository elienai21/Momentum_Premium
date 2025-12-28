// web/src/pages/Transactions.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Filter, Download, Search, CheckCircle, AlertCircle } from "lucide-react";
import api from "../services/api";
import { useToast } from "../components/Toast";
import { GlassPanel } from "../components/ui/GlassPanel";
import { SectionHeader } from "../components/ui/SectionHeader";
import { Badge } from "../components/ui/Badge";
import { cn } from "../lib/utils";

interface Tx {
  date: string;
  description: string;
  category: string;
  type: "credit" | "debit";
  amount: number;
}

interface FilterResp {
  transactions: Tx[];
}

interface Meta {
  categories: string[];
  cards: string[];
}

interface ForecastResp {
  meta?: Meta;
}

const Transactions: React.FC = () => {
  const { notify } = useToast();

  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [card, setCard] = useState<string>("");
  const [q, setQ] = useState<string>("");

  const [meta, setMeta] = useState<Meta>({ categories: [], cards: [] });
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const filterPayload = useMemo(
    () => ({
      from: from || null,
      to: to || null,
      category: category || null,
      type: type || null,
      card: card || null,
      q: q || null,
    }),
    [from, to, category, type, card, q],
  );

  async function loadAll() {
    setLoading(true);
    try {
      const [forecastResp, filteredResp] = await Promise.all([
        api.get<ForecastResp>("/portal/forecast", {
          params: { from: from || "", to: to || "" },
        }),
        api.post<FilterResp>("/portal/transactions/filter", filterPayload),
      ]);

      const forecast = forecastResp.data;
      const filtered = filteredResp.data;

      setMeta(forecast?.meta || { categories: [], cards: [] });
      setTransactions(filtered?.transactions || []);
    } catch (e: any) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.error("Erro ao carregar transações:", e);
      }
      notify({
        type: "error",
        message: "Não foi possível carregar o extrato. Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  function exportCSV() {
    const header = "data,descricao,categoria,tipo,valor\n";
    const rows = transactions.map((t) =>
      [t.date, t.description, t.category, t.type, String(t.amount)].join(","),
    );
    const blob = new Blob([header + rows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transacoes.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-8 transition-colors duration-300" aria-live="polite">
      <SectionHeader
        title="Transações"
        subtitle="Filtre, pesquise e exporte seu extrato completo."
        actions={
          <div className="flex gap-2">
            <button
              onClick={loadAll}
              disabled={loading}
              className="bg-momentum-accent hover:bg-momentum-accent/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-momentum-glow flex items-center gap-2 disabled:opacity-70"
            >
              {loading ? "Carregando..." : <><Filter size={16} /> Aplicar filtros</>}
            </button>
            <button
              onClick={exportCSV}
              className="bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-momentum-text border border-momentum-border px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
            >
              <Download size={16} /> Exportar CSV
            </button>
          </div>
        }
      />

      <GlassPanel className="p-6">
        <div className="grid gap-6 md:grid-cols-6 items-end">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-momentum-muted uppercase tracking-wider">Período (De)</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full bg-momentum-bg/50 border border-momentum-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-momentum-accent outline-none transition-all text-momentum-text"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-momentum-muted uppercase tracking-wider">Período (Até)</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full bg-momentum-bg/50 border border-momentum-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-momentum-accent outline-none transition-all text-momentum-text"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-momentum-muted uppercase tracking-wider">Categoria</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-momentum-bg/50 border border-momentum-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-momentum-accent outline-none transition-all text-momentum-text"
            >
              <option value="">Todas</option>
              {meta.categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-momentum-muted uppercase tracking-wider">Tipo</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-momentum-bg/50 border border-momentum-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-momentum-accent outline-none transition-all text-momentum-text"
            >
              <option value="">Todos</option>
              <option value="credit">Crédito</option>
              <option value="debit">Débito</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-momentum-muted uppercase tracking-wider">Cartão</label>
            <select
              value={card}
              onChange={(e) => setCard(e.target.value)}
              className="w-full bg-momentum-bg/50 border border-momentum-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-momentum-accent outline-none transition-all text-momentum-text"
            >
              <option value="">Todos</option>
              {meta.cards.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-momentum-muted uppercase tracking-wider">Busca</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-momentum-muted" size={16} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                type="text"
                placeholder="Descrição, categoria, cartão..."
                className="w-full pl-10 bg-momentum-bg/50 border border-momentum-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-momentum-accent outline-none transition-all text-momentum-text"
              />
            </div>
          </div>
        </div>
      </GlassPanel>

      <GlassPanel className="p-0 overflow-hidden">
        <div className="p-6 border-b border-momentum-border flex items-center justify-between">
          <h3 className="font-bold text-lg text-momentum-text">Transações</h3>
          <Badge variant="neutral">{transactions.length} registros</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-momentum-muted/5 text-momentum-muted font-semibold uppercase text-xs tracking-wider border-b border-momentum-border">
              <tr>
                <th className="px-6 py-4">
                  Data
                </th>
                <th className="px-6 py-4">
                  Descrição
                </th>
                <th className="px-6 py-4">
                  Categoria
                </th>
                <th className="px-6 py-4">
                  Tipo
                </th>
                <th className="px-6 py-4 text-right">
                  Valor
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-momentum-border">
              {transactions.map((tx, i) => (
                <tr
                  key={i}
                  className="transition hover:bg-momentum-accent/5"
                >
                  <td className="px-6 py-4 font-medium text-momentum-text">
                    {tx.date}
                  </td>
                  <td className="px-6 py-4 text-momentum-muted">
                    {tx.description}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="neutral" className="bg-momentum-bg/50 border-momentum-border">
                      {tx.category}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={tx.type === 'credit' ? 'success' : 'danger'} className="gap-1.5">
                      {tx.type === 'credit' ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
                      {tx.type === 'credit' ? "Crédito" : "Débito"}
                    </Badge>
                  </td>
                  <td
                    className={cn(
                      "px-6 py-4 text-right font-bold",
                      tx.type === 'credit' ? "text-momentum-success" : "text-momentum-danger"
                    )}
                  >
                    {Math.abs(tx.amount || 0).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassPanel>
    </div>
  );
};

export default Transactions;
