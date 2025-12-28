import React from "react";
import { 
  Activity, 
  AlertTriangle, 
  ShieldCheck, 
  AlertOctagon, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Clock
} from "lucide-react";

// Tipagem baseada na resposta da API /api/cfo/health
interface HealthData {
  score: number;
  status: 'EXCELLENT' | 'STABLE' | 'CRITICAL' | 'DANGER';
  aiComment: string;
  runwayMonths: number;
  metrics: {
    cashFlowRatio: number; // Ex: 0.15 (15%)
    marginRatio: number;
    debtRatio: number;
  };
}

interface Props {
  loading: boolean;
  error: Error | null;
  data: HealthData | null | undefined;
  onRetry?: () => void;
}

const STATUS_CONFIG = {
  EXCELLENT: {
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    icon: ShieldCheck,
    label: "Excelência Financeira"
  },
  STABLE: {
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: Activity,
    label: "Operação Estável"
  },
  CRITICAL: {
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: AlertTriangle,
    label: "Atenção Necessária"
  },
  DANGER: {
    color: "text-rose-600",
    bg: "bg-rose-50",
    border: "border-rose-200",
    icon: AlertOctagon,
    label: "Risco Iminente"
  }
};

export default function HealthScoreCard({ loading, error, data, onRetry }: Props) {
  // 1. Loading Skeleton
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm animate-pulse h-[280px]">
        <div className="flex justify-between items-start mb-6">
          <div className="h-6 w-32 bg-slate-200 rounded" />
          <div className="h-10 w-10 bg-slate-200 rounded-full" />
        </div>
        <div className="h-24 w-24 bg-slate-200 rounded-full mx-auto mb-6" />
        <div className="space-y-3">
          <div className="h-4 w-full bg-slate-200 rounded" />
          <div className="h-4 w-3/4 bg-slate-200 rounded" />
        </div>
      </div>
    );
  }

  // 2. Error State
  if (error || !data) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 flex flex-col items-center justify-center text-center h-full min-h-[200px]">
        <AlertTriangle className="h-8 w-8 text-rose-500 mb-3" />
        <h3 className="text-sm font-semibold text-rose-900">Falha no Diagnóstico</h3>
        <p className="text-xs text-rose-700 mt-1 mb-4">
          Não foi possível calcular a saúde financeira.
        </p>
        {onRetry && (
          <button 
            onClick={onRetry}
            className="text-xs bg-white border border-rose-200 text-rose-700 px-3 py-2 rounded-lg hover:bg-rose-50 transition-colors"
          >
            Tentar Novamente
          </button>
        )}
      </div>
    );
  }

  const config = STATUS_CONFIG[data.status] || STATUS_CONFIG.CRITICAL;
  const Icon = config.icon;

  // Helpers para renderizar os fatores de risco/sucesso
  const renderFactors = () => {
    const factors = [];

    // Fator Runway
    if (data.runwayMonths < 3) {
      factors.push({ icon: Clock, label: "Runway Curto (< 3 meses)", type: 'bad' });
    } else if (data.runwayMonths > 12) {
      factors.push({ icon: Clock, label: "Runway Estendido (> 12 meses)", type: 'good' });
    }

    // Fator Fluxo de Caixa (metrics.cashFlowRatio)
    if (data.metrics.cashFlowRatio < 0) {
      factors.push({ icon: TrendingDown, label: "Queima de Caixa (Cash Negative)", type: 'bad' });
    } else {
      factors.push({ icon: TrendingUp, label: "Geração de Caixa (Cash Positive)", type: 'good' });
    }

    // Fator Margem (exemplo)
    if (data.metrics.marginRatio < 0.10) {
      factors.push({ icon: DollarSign, label: "Margem Apertada (< 10%)", type: 'warn' });
    }

    return factors.map((f, idx) => (
      <div key={idx} className="flex items-center gap-2 text-xs">
        <f.icon className={`h-3.5 w-3.5 ${
          f.type === 'good' ? 'text-emerald-500' : f.type === 'bad' ? 'text-rose-500' : 'text-amber-500'
        }`} />
        <span className="text-slate-600">{f.label}</span>
      </div>
    ));
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col h-full">
      {/* Header com Status */}
      <div className={`px-6 py-4 border-b ${config.border} ${config.bg} flex items-center justify-between`}>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Saúde Financeira</h3>
          <p className={`text-xs font-medium mt-0.5 ${config.color}`}>{config.label}</p>
        </div>
        <div className={`p-2 rounded-full bg-white/60 ${config.color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="p-6 flex-1 flex flex-col gap-6">
        {/* Score Principal */}
        <div className="flex items-center gap-6">
          <div className="relative h-20 w-20 flex-shrink-0 flex items-center justify-center">
            {/* SVG Ring Simplificado */}
            <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 36 36">
              <path
                className="text-slate-100"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                className={config.color}
                strokeDasharray={`${data.score}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-slate-900">{data.score}</span>
              <span className="text-[10px] text-slate-400 font-medium">/100</span>
            </div>
          </div>

          {/* Comentário da IA */}
          <div className="flex-1">
            <p className="text-xs text-slate-500 italic mb-1">Análise do CFO:</p>
            <p className="text-sm text-slate-700 leading-snug">
              "{data.aiComment}"
            </p>
          </div>
        </div>

        {/* Lista de Fatores */}
        <div className="space-y-2 pt-4 border-t border-slate-100">
          <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-2">
            Indicadores Chave
          </p>
          {renderFactors()}
        </div>
      </div>
    </section>
  );
}