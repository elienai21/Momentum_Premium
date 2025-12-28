// web/src/pages/Transactions.tsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { useToast } from "../components/Toast";

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
    <main className="p-6 space-y-6" aria-live="polite">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            Transações
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Filtre, pesquise e exporte seu extrato completo.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadAll}
            className="btn primary text-xs px-3 py-2"
          >
            {loading ? "Carregando..." : "Aplicar filtros"}
          </button>
          <button
            onClick={exportCSV}
            className="btn neutral text-xs px-3 py-2"
          >
            Exportar CSV
          </button>
        </div>
      </header>

      <section className="card p-4">
        <div className="grid gap-3 md:grid-cols-6">
          {[
            ["Período (de)", from, setFrom, "date"],
            ["Período (até)", to, setTo, "date"],
          ].map(([label, value, setFn, type], i) => (
            <div key={i} className="flex flex-col gap-1">
              <label className="text-sm opacity-70">{label as string}</label>
              <input
                value={value as string}
                onChange={(e) => (setFn as any)(e.target.value)}
                type={type as string}
                className="glass border border-white/10 rounded-lg px-3 py-2"
              />
            </div>
          ))}
          <div className="flex flex-col gap-1">
            <label className="text-sm opacity-70">Categoria</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="glass border border-white/10 rounded-lg px-3 py-2"
            >
              <option value="">Todas</option>
              {meta.categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm opacity-70">Tipo</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="glass border border-white/10 rounded-lg px-3 py-2"
            >
              <option value="">Todos</option>
              <option value="credit">Crédito</option>
              <option value="debit">Débito</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm opacity-70">Cartão</label>
            <select
              value={card}
              onChange={(e) => setCard(e.target.value)}
              className="glass border border-white/10 rounded-lg px-3 py-2"
            >
              <option value="">Todos</option>
              {meta.cards.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-sm opacity-70">Busca</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              type="text"
              placeholder="Descrição, categoria, cartão..."
              className="glass border border-white/10 rounded-lg px-3 py-2"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 items-center">
          <button
            onClick={loadAll}
            className="btn primary hover:-translate-y-px transition-all duration-300"
          >
            {loading ? "Carregando..." : "Aplicar"}
          </button>
          <button
            onClick={exportCSV}
            className="btn neutral hover:-translate-y-px transition-all duration-300"
          >
            Exportar CSV
          </button>
        </div>
      </section>

      <section className="card p-4">
        <div className="flex items-center justify-between mb-3 gap-2">
          <h3 className="font-semibold">Transações</h3>
          <span className="text-xs text-[var(--text-2)]">
            {transactions.length} registros
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border border-white/10 rounded-xl">
            <thead className="text-[var(--text-2)]">
              <tr>
                <th className="text-left px-4 py-2 border-b border-white/10">
                  Data
                </th>
                <th className="text-left px-4 py-2 border-b border-white/10">
                  Descrição
                </th>
                <th className="text-left px-4 py-2 border-b border-white/10">
                  Categoria
                </th>
                <th className="text-left px-4 py-2 border-b border-white/10">
                  Tipo
                </th>
                <th className="text-right px-4 py-2 border-b border-white/10">
                  Valor
                </th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx, i) => (
                <tr
                  key={i}
                  className="transition hover:bg-[rgba(110,52,255,0.05)]"
                >
                  <td className="px-4 py-2 border-b border-white/10">
                    {tx.date}
                  </td>
                  <td className="px-4 py-2 border-b border-white/10">
                    {tx.description}
                  </td>
                  <td className="px-4 py-2 border-b border-white/10">
                    {tx.category}
                  </td>
                  <td className="px-4 py-2 border-b border-white/10">
                    <span
                      className={`px-2 py-1 rounded-full border text-xs ${
                        tx.type === "credit"
                          ? "border-emerald-400/40 text-emerald-300"
                          : "border-rose-400/40 text-rose-300"
                      }`}
                    >
                      {tx.type === "credit" ? "Crédito" : "Débito"}
                    </span>
                  </td>
                  <td
                    className={`px-4 py-2 border-b border-white/10 text-right ${
                      tx.type === "credit" ? "text-emerald-400" : "text-rose-400"
                    }`}
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
      </section>
    </main>
  );
};

export default Transactions;
