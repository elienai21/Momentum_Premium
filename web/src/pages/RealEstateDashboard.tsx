// web/src/pages/RealEstateDashboard.tsx
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Building2,
  TrendingUp,
  Wallet,
  CircleDollarSign,
  Percent,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronRight,
  Plus,
  Home,
  User
} from "lucide-react";

// APIs & Types
import {
  getPortfolioSummary,
  listBuildings,
  listUnits,
  PortfolioSummary,
  Building,
  Unit
} from "../services/realEstateApi";

// Components
import { NewPropertyModal } from "../components/realEstate/NewPropertyModal";
import { NewOwnerModal } from "../components/realEstate/NewOwnerModal";
import { NewBuildingModal } from "../components/realEstate/NewBuildingModal";

// Primitives
import { GlassPanel } from "../components/ui/GlassPanel";
import { SectionHeader } from "../components/ui/SectionHeader";
import { StatsCard } from "../components/ui/StatsCard";
import { Badge } from "../components/ui/Badge";
import { AsyncPanel } from "../components/ui/AsyncPanel";
import { cn } from "../lib/utils";

const currency = (n: number | undefined | null) => {
  if (n === undefined || n === null) return "R$ 0,00";
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

export default function RealEstateDashboard() {
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expandedBuildings, setExpandedBuildings] = useState<Record<string, boolean>>({ "avulsas": true });

  // Modal states
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [showOwnerModal, setShowOwnerModal] = useState(false);
  const [showBuildingModal, setShowBuildingModal] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summ, bldgs, unts] = await Promise.all([
        getPortfolioSummary(30),
        listBuildings(),
        listUnits()
      ]);
      setSummary(summ);
      setBuildings(bldgs);
      setUnits(unts);
    } catch (err: any) {
      console.error("[RealEstateDashboard] Erro:", err);
      setError("Falha ao carregar dados do portfólio.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleBuilding = (id: string) => {
    setExpandedBuildings(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredBuildings = useMemo(() => {
    const s = search.toLowerCase();
    return (buildings || []).filter(b => b.name.toLowerCase().includes(s));
  }, [buildings, search]);

  const unitsByBuilding = useMemo(() => {
    const map: Record<string, Unit[]> = {};
    (units || []).forEach(u => {
      const key = u.buildingId || "avulsas";
      if (!map[key]) map[key] = [];
      map[key].push(u);
    });
    return map;
  }, [units]);

  return (
    <div className="pt-24 space-y-8 pb-24 fade-in">
      <SectionHeader
        title={
          <div className="flex items-center gap-2">
            <Building2 size={24} className="text-primary" />
            <span className="tracking-tight font-display">Portfólio Imobiliário</span>
          </div>
        }
        subtitle="Gestão centralizada por edifícios e propriedades individuais."
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              onClick={loadData}
              className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl text-sm font-bold transition-all shadow-sm flex items-center gap-2 active:scale-95"
              title="Atualizar"
            >
              <RefreshCw size={14} className={cn(loading && "animate-spin")} />
            </button>
            <button
              onClick={() => setShowOwnerModal(true)}
              className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm flex items-center gap-2 active:scale-95 font-display"
            >
              <User size={14} />
              <span className="hidden sm:inline">Proprietário</span>
            </button>
            <button
              onClick={() => setShowBuildingModal(true)}
              className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm flex items-center gap-2 active:scale-95 font-display"
            >
              <Building2 size={14} />
              <span className="hidden sm:inline">Edifício</span>
            </button>
            <button
              onClick={() => setShowPropertyModal(true)}
              className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-glow flex items-center gap-2 active:scale-95 font-display"
            >
              <Plus size={16} />
              Imóvel
            </button>
          </div>
        }
      />

      {/* Modals */}
      {showPropertyModal && (
        <NewPropertyModal
          onClose={() => setShowPropertyModal(false)}
          onSuccess={loadData}
        />
      )}
      {showOwnerModal && (
        <NewOwnerModal
          onClose={() => setShowOwnerModal(false)}
          onSuccess={loadData}
        />
      )}
      {showBuildingModal && (
        <NewBuildingModal
          onClose={() => setShowBuildingModal(false)}
          onSuccess={loadData}
        />
      )}

      {/* KPI Cards */}
      <AsyncPanel isLoading={loading} error={error} isEmpty={false}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            label="Receita Bruta (30d)"
            value={currency(summary?.totals?.grossRevenue)}
            icon={TrendingUp}
            variant="default"
          />
          <StatsCard
            label="Unidades Ativas"
            value={summary?.totals?.activeUnits?.toString() || "0"}
            icon={Home}
            variant="default"
          />
          <StatsCard
            label="Lucro Operacional"
            value={currency(summary?.totals?.netRevenue)}
            icon={CircleDollarSign}
            variant="success"
          />
          <StatsCard
            label="Booking Volume"
            value={summary?.totals?.staysCount?.toString() || "0"}
            icon={Percent}
            variant="default"
          />
        </div>
      </AsyncPanel>

      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            Edifícios & Ativos
            <Badge variant="neutral">{buildings.length}</Badge>
          </h3>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar edifício..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
            />
          </div>
        </div>

        <div className="space-y-4">
          {/* Listagem de Edifícios */}
          {filteredBuildings.map(bldg => (
            <div key={bldg.id} className="group">
              <button
                onClick={() => toggleBuilding(bldg.id)}
                className="w-full flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl hover:border-blue-300 transition-all shadow-sm group-hover:shadow-md"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <Building2 size={24} />
                  </div>
                  <div className="text-left leading-tight">
                    <h4 className="font-bold text-slate-900">{bldg.name}</h4>
                    <p className="text-xs text-slate-500">{bldg.address || "Sem endereço cadastrado"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="hidden md:block text-right">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Unidades</p>
                    <p className="font-bold text-slate-700">{unitsByBuilding[bldg.id]?.length || 0}</p>
                  </div>
                  {expandedBuildings[bldg.id] ? <ChevronDown className="text-slate-400" /> : <ChevronRight className="text-slate-400" />}
                </div>
              </button>

              {expandedBuildings[bldg.id] && (
                <div className="mt-2 ml-6 pl-6 border-l-2 border-slate-100 space-y-2 animate-in slide-in-from-top-2 duration-300">
                  {unitsByBuilding[bldg.id]?.map(unit => (
                    <div key={unit.id} className="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl border border-slate-100/50 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <Badge variant={unit.active ? "success" : "neutral"}>{unit.code}</Badge>
                        <span className="text-sm font-medium text-slate-700">{unit.name || "Sem nome"}</span>
                      </div>
                      <button className="text-xs font-bold text-blue-600 hover:text-blue-700">DETALHES</button>
                    </div>
                  )) || <p className="text-xs text-slate-400 italic">Nenhuma unidade vinculada.</p>}
                </div>
              )}
            </div>
          ))}

          {/* Propriedades Avulsas */}
          <div className="group">
            <button
              onClick={() => toggleBuilding("avulsas")}
              className="w-full flex items-center justify-between p-4 bg-slate-50 border border-dashed border-slate-300 rounded-2xl hover:border-slate-400 transition-all shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-200 flex items-center justify-center text-slate-500">
                  <Home size={24} />
                </div>
                <div className="text-left leading-tight">
                  <h4 className="font-bold text-slate-700 tracking-tight">Propriedades Avulsas</h4>
                  <p className="text-xs text-slate-500 italic">Unidades sem edifício vinculado</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="hidden md:block text-right">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Contagem</p>
                  <p className="font-bold text-slate-600">{unitsByBuilding["avulsas"]?.length || 0}</p>
                </div>
                {expandedBuildings["avulsas"] ? <ChevronDown className="text-slate-400" /> : <ChevronRight className="text-slate-400" />}
              </div>
            </button>

            {expandedBuildings["avulsas"] && (
              <div className="mt-2 ml-6 pl-6 border-l-2 border-slate-100 space-y-2 animate-in slide-in-from-top-2 duration-300">
                {unitsByBuilding["avulsas"]?.map(unit => (
                  <div key={unit.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 hover:shadow-sm transition-all">
                    <div className="flex items-center gap-3">
                      <Badge variant={unit.active ? "success" : "neutral"}>{unit.code}</Badge>
                      <span className="text-sm font-medium text-slate-700">{unit.name || "Sem nome"}</span>
                    </div>
                    <button className="text-xs font-bold text-blue-600 hover:text-blue-700">DETALHES</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Billing Preview Section */}
      {summary?.potentialCharges && (
        <GlassPanel className="p-6 border-slate-200 shadow-xl shadow-slate-200/40">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center md:text-left">
              <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2 justify-center md:justify-start">
                <CircleDollarSign className="text-emerald-500" size={20} />
                Billing Preview
              </h3>
              <p className="text-sm text-slate-500 max-w-lg">
                Estimativa mensal baseada na volumetria atual do seu portfólio ({summary.totals.activeOwners} proprietários e {summary.totals.activeUnits} unidades).
              </p>
            </div>
            <div className="flex items-center gap-8 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
              <div className="text-center">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Base Mensal</p>
                <p className="text-xl font-black text-slate-900 tracking-tighter">{currency(summary.potentialCharges.total)}</p>
              </div>
              <ChevronRight size={20} className="text-slate-200" />
              <button className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all">
                Upgrade Pro
              </button>
            </div>
          </div>
        </GlassPanel>
      )}
    </div>
  );
}
