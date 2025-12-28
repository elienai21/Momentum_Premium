// web/src/pages/RealEstateDashboard.tsx
import { useEffect, useMemo, useState, useCallback } from "react";
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
import {
  Building2,
  TrendingUp,
  Wallet,
  CircleDollarSign,
  Percent,
  RefreshCw,
  Search,
  ChevronRight
} from "lucide-react";

// Primitives
import { GlassPanel } from "../components/ui/GlassPanel";
import { SectionHeader } from "../components/ui/SectionHeader";
import { StatsCard } from "../components/ui/StatsCard";
import { Badge } from "../components/ui/Badge";
import { AsyncPanel } from "../components/ui/AsyncPanel";
import { cn } from "../lib/utils";

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
  const [y, m] = month.split("-");
  const num = Number(m);
  const meses = [
    "", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
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
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
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
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const s = search.toLowerCase();
    return items.filter(it =>
      it.unitCode?.toLowerCase().includes(s) ||
      it.ownerName?.toLowerCase().includes(s) ||
      it.month.includes(s)
    );
  }, [items, search]);

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

  return (
    <div className="space-y-8 pb-24 fade-in">
      <SectionHeader
        title={
          <div className="flex items-center gap-2">
            <Building2 size={24} className="text-momentum-accent" />
            <span>Real Estate · Performance</span>
          </div>
        }
        subtitle="Consolidado de repasses, receita bruta e payout Vivare por unidade."
        actions={
          <div className="flex gap-2">
            <button
              onClick={load}
              className="bg-momentum-bg/50 hover:bg-white text-momentum-text border border-momentum-border px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm flex items-center gap-2"
            >
              <RefreshCw size={14} className={cn(loading && "animate-spin")} /> Atualizar
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          label="Receita Bruta"
          value={currency(summary.totalGross)}
          icon={TrendingUp}
          variant="default"
        />
        <StatsCard
          label="Repasses Proprietários"
          value={currency(summary.totalOwner)}
          icon={Wallet}
          variant="default"
        />
        <StatsCard
          label="Payout Vivare"
          value={currency(summary.totalHouse)}
          icon={CircleDollarSign}
          variant="success"
        />
        <StatsCard
          label="Margem Média"
          value={`${(summary.avgMargin * 100).toFixed(1)}%`}
          icon={Percent}
          variant="default"
        />
      </div>

      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-momentum-text font-display flex items-center gap-2">
            Meses Consolidados
            <Badge variant="neutral">{filteredItems.length}</Badge>
          </h3>

          <div className="relative group w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-momentum-muted group-focus-within:text-momentum-accent transition-colors" />
            <input
              type="text"
              placeholder="Buscar unidade ou proprietário..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/50 dark:bg-slate-900/50 border border-momentum-border rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-momentum-accent/20 focus:border-momentum-accent transition-all"
            />
          </div>
        </div>

        <AsyncPanel
          isLoading={loading}
          error={error}
          isEmpty={items.length === 0}
          emptyTitle="Nenhum dado de Real Estate"
          emptyDescription={`Nenhum registro encontrado em tenants/${tenantId}/realEstate_statements.`}
        >
          <GlassPanel className="p-0 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-momentum-muted/5 text-momentum-muted font-bold uppercase tracking-widest text-[10px] border-b border-momentum-border">
                  <tr>
                    <th className="px-6 py-4">Mês</th>
                    <th className="px-6 py-4">Unidade</th>
                    <th className="px-6 py-4">Proprietário</th>
                    <th className="px-6 py-4 text-right">Receita Bruta</th>
                    <th className="px-6 py-4 text-right">Taxas / Gestão</th>
                    <th className="px-6 py-4 text-right">Repasse</th>
                    <th className="px-6 py-4 text-right">Payout Vivare</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-momentum-border">
                  {filteredItems.map((it) => {
                    const costs =
                      (it.cleaningFees ?? 0) +
                      (it.platformFees ?? 0) +
                      (it.otherCosts ?? 0);

                    return (
                      <tr
                        key={it.id}
                        className="group hover:bg-momentum-accent/5 transition-colors cursor-default"
                      >
                        <td className="px-6 py-4">
                          <div className="font-semibold text-momentum-text">{parseMonthLabel(it.month)}</div>
                        </td>
                        <td className="px-6 py-4 font-medium text-momentum-text">
                          <div className="flex items-center gap-2">
                            <Building2 size={14} className="text-momentum-muted" />
                            {it.unitCode || "N/A"}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-momentum-muted">
                          {it.ownerName || "Não Informado"}
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-momentum-text">
                          {currency(it.grossRevenue)}
                        </td>
                        <td className="px-6 py-4 text-right text-momentum-muted">
                          {currency(costs)}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-momentum-text">
                          {currency(it.ownerPayout)}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-momentum-success">
                          <div className="flex items-center justify-end gap-1">
                            {currency(it.realEstatePayouts)}
                            <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity translate-x-1" />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </GlassPanel>
        </AsyncPanel>
      </div>
    </div>
  );
}
