// web/src/pages/RealEstateDashboard.tsx
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  orderBy,
  query,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import { db } from "../services/firebase";
import { useTenant } from "../context/TenantContext";
import { Loader2 } from "lucide-react";

// Commercial baseline: o backend gera demonstrativos em `tenants/{tenantId}/realEstate_statements`.
// Evite trocar o nome dessa coleção sem alinhar backend + dashboard (senão o painel fica vazio).
const REAL_ESTATE_STATEMENTS_COLLECTION = "realEstate_statements" as const;

type RealEstateMonthDoc = {
  id: string;
  month: string; // "2025-12"
  unitCode?: string;
  ownerName?: string;
  ownerId?: string;
  grossRevenue?: number;
  cleaningFees?: number;
  platformFees?: number;
  otherCosts?: number;
  ownerPayout?: number;
  realEstatePayouts?: number;
};

function parseMonthLabel(month: string | undefined): string {
  if (!month) return "Mês não definido";
  // Espera algo tipo "2025-12"
  const [y, m] = month.split("-");
  const num = Number(m);
  const meses = [
    "",
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];
  if (!isNaN(num) && num >= 1 && num <= 12) {
    return `${meses[num]}/${y}`;
  }
  return month;
}

function currency(n: number | undefined | null): string {
  if (!n) return "R$ 0,00";
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

export default function RealEstateDashboard() {
  const { tenantId } = useTenant();
  const [items, setItems] = useState<RealEstateMonthDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        if (!tenantId) {
          throw new Error("tenantId ausente");
        }
        const colRef = collection(
          db,
          "tenants",
          tenantId,
          REAL_ESTATE_STATEMENTS_COLLECTION,
        );
        const q = query(colRef, orderBy("month", "desc"));
        const snap = await getDocs(q);

        if (!active) return;

        const rows: RealEstateMonthDoc[] = [];

        snap.docs.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
          const d = (doc.data() || {}) as any;
          const month = String(d.month ?? doc.id);
          const ownerId = d.ownerId ? String(d.ownerId) : undefined;
          const ownerShareRate =
            typeof d.ownerShareRate === "number" ? Number(d.ownerShareRate) : 1;

          const units = Array.isArray(d.units) ? d.units : [];
          units.forEach((u: any, idx: number) => {
            const grossRevenue = Number(u.grossRevenue ?? 0);
            const cleaningFees = Number(u.cleaningFees ?? 0);
            const platformFees = Number(u.platformFees ?? 0);
            const otherCosts = Number(u.otherCosts ?? 0);
            const netRevenue =
              typeof u.netRevenue === "number"
                ? Number(u.netRevenue)
                : grossRevenue - (cleaningFees + platformFees + otherCosts);

            const ownerPayout = netRevenue * ownerShareRate;
            const housePayout = netRevenue - ownerPayout;

            rows.push({
              id: `${doc.id}:${idx}`,
              month,
              unitCode: u.unitCode,
              ownerName: ownerId,
              ownerId,
              grossRevenue,
              cleaningFees,
              platformFees,
              otherCosts,
              ownerPayout,
              realEstatePayouts: housePayout,
            });
          });
        });

        setItems(rows);
      } catch (err: any) {
        console.error("[RealEstate] erro ao carregar dados:", err);
        setError(
          err?.message ||
            "Não foi possível carregar os dados de Real Estate.",
        );
      } finally {
        if (!active) return;
        setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [tenantId]);

  const summary = useMemo(() => {
    if (!items.length) {
      return {
        totalGross: 0,
        totalOwner: 0,
        totalHouse: 0,
        totalCosts: 0,
        avgMargin: 0,
      };
    }

    let totalGross = 0;
    let totalOwner = 0;
    let totalHouse = 0;
    let totalCosts = 0;

    for (const it of items) {
      const gross = it.grossRevenue ?? 0;
      const owner = it.ownerPayout ?? 0;
      const house = it.realEstatePayouts ?? 0;
      const costs =
        (it.cleaningFees ?? 0) +
        (it.platformFees ?? 0) +
        (it.otherCosts ?? 0);

      totalGross += gross;
      totalOwner += owner;
      totalHouse += house;
      totalCosts += costs;
    }

    const profitHouse = totalHouse;
    const avgMargin =
      totalGross > 0 ? profitHouse / totalGross : 0;

    return {
      totalGross,
      totalOwner,
      totalHouse,
      totalCosts,
      avgMargin,
    };
  }, [items]);

  const hasData = items.length > 0;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Cabeçalho */}
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-lg md:text-xl font-semibold text-slate-50">
            Real Estate · Performance por Imóvel
          </h1>
          <p className="text-xs md:text-sm text-slate-400 max-w-xl">
            Visão consolidada dos repasses aos proprietários, receita bruta
            e payout da Vivare por unidade e por mês.
          </p>
        </div>
      </header>

      {/* Loading / erro */}
      {loading && (
        <div className="flex h-40 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/40">
          <div className="flex flex-col items-center gap-2 text-slate-300">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
            <span className="text-xs">
              Carregando dados de Real Estate...
            </span>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-950/30 p-4 text-sm text-rose-100">
          {error}
        </div>
      )}

      {!loading && !error && !hasData && (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-6 text-sm text-slate-200">
          <p className="font-medium mb-1">
            Nenhum dado de Real Estate encontrado.
          </p>
          <p className="text-xs text-slate-400 max-w-xl">
            Cadastre documentos na coleção{" "}
            <code className="rounded bg-slate-900 px-1.5 py-0.5 text-[10px]">
              tenants/{tenantId}/realEstate_statements
            </code>{" "}
            para começar a acompanhar o desempenho dos imóveis.
          </p>
        </div>
      )}

      {hasData && !loading && !error && (
        <>
          {/* Cards de resumo */}
          <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-[0.16em]">
                Receita Bruta
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-50">
                {currency(summary.totalGross)}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Soma de todos os meses carregados.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-[0.16em]">
                Repasses para Proprietários
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-50">
                {currency(summary.totalOwner)}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Total pago aos donos dos imóveis.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-[0.16em]">
                Payout Vivare
              </p>
              <p className="mt-2 text-lg font-semibold text-emerald-400">
                {currency(summary.totalHouse)}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Receita líquida da operação de hospedagem.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-[0.16em]">
                Margem Média Vivare
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-50">
                {(summary.avgMargin * 100).toFixed(1)}%
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Payout Vivare ÷ Receita Bruta.
              </p>
            </div>
          </section>

          {/* Tabela dos meses */}
          <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-50">
                Meses consolidados
              </h2>
              <p className="text-[11px] text-slate-500">
                {items.length} registro(s) carregado(s)
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs text-slate-300">
                <thead className="border-b border-slate-800/80 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                  <tr>
                    <th className="py-2 pr-4">Mês</th>
                    <th className="py-2 px-4">Unidade</th>
                    <th className="py-2 px-4">Proprietário</th>
                    <th className="py-2 px-4">Receita bruta</th>
                    <th className="py-2 px-4">Taxas / custos</th>
                    <th className="py-2 px-4">Repasse proprietário</th>
                    <th className="py-2 px-4">Payout Vivare</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => {
                    const costs =
                      (it.cleaningFees ?? 0) +
                      (it.platformFees ?? 0) +
                      (it.otherCosts ?? 0);

                    return (
                      <tr
                        key={it.id}
                        className="border-b border-slate-900/60 last:border-0"
                      >
                        <td className="py-2 pr-4 text-slate-100 whitespace-nowrap">
                          {parseMonthLabel(it.month)}
                        </td>
                        <td className="py-2 px-4 whitespace-nowrap">
                          {it.unitCode || "-"}
                        </td>
                        <td className="py-2 px-4 whitespace-nowrap">
                          {it.ownerName || "-"}
                        </td>
                        <td className="py-2 px-4">
                          {currency(it.grossRevenue)}
                        </td>
                        <td className="py-2 px-4">
                          {currency(costs)}
                        </td>
                        <td className="py-2 px-4">
                          {currency(it.ownerPayout)}
                        </td>
                        <td className="py-2 px-4 text-emerald-300">
                          {currency(it.realEstatePayouts)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
