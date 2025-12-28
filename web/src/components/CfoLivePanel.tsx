// web/src/components/CfoLivePanel.tsx
import { Wifi, WifiOff, Loader2 } from "lucide-react";
import { useRealtimeCfoSession } from "../hooks/useRealtimeCfoSession";
import VoicePanel from "./VoicePanel";
import { useAuthToken } from "../hooks/useAuthToken";

type CfoLivePanelProps = {
  tenantId: string;
  plan?: string | null;
};

/**
 * Painel "CFO Live" pensado para uso intenso em mobile:
 * - Estado simples: desconectado / conectando / conectado.
 * - Botão grande para iniciar a sessão.
 * - Quando conectado, renderiza o VoicePanel padrão.
 *
 * Por enquanto, o áudio continua sendo tratado pelo fluxo atual
 * (STT/TTS via HTTP). A sessão Realtime já é criada e fica pronta
 * para futura integração com WebSocket/streaming.
 */
export function CfoLivePanel({ tenantId, plan }: CfoLivePanelProps) {
  const token = useAuthToken();
  const { session, isConnected, loading, error, connect, reset } =
    useRealtimeCfoSession();

  // Sem usuário autenticado, não mostra nada
  if (!token) return null;

  const normalizedPlan = (plan || "").toLowerCase();
  const planHasVoice = normalizedPlan === "cfo" || normalizedPlan === "pro";

  if (!planHasVoice) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-xs text-slate-600">
        <p className="mb-1 font-medium text-slate-800">
          CFO Live por voz não incluído neste plano
        </p>
        <p>
          Para falar com o CFO em tempo real por voz e receber orientações
          personalizadas, faça upgrade para um plano com o módulo de voz
          ativado.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 flex flex-col gap-3">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            CFO Live por Voz{" "}
            <span className="ml-1 text-[10px] text-sky-500 font-medium">
              Beta
            </span>
          </h3>
          <p className="text-xs text-slate-500">
            Use o CFO por voz em sessões rápidas, pensado para uso frequente no
            mobile. Ideal para tirar dúvidas de caixa enquanto você está na
            rua.
          </p>
        </div>

        <div className="flex items-center gap-1 text-[11px]">
          {isConnected ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-emerald-700 border border-emerald-100">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <Wifi className="h-3 w-3" />
              Conectado
            </span>
          ) : loading ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-slate-600 border border-slate-200">
              <Loader2 className="h-3 w-3 animate-spin" />
              Conectando...
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-slate-500 border border-slate-200">
              <WifiOff className="h-3 w-3" />
              Desconectado
            </span>
          )}
        </div>
      </header>

      {/* Botão principal de sessão – focado em uso mobile */}
      <div className="flex flex-col gap-2">
        {!isConnected ? (
          <button
            type="button"
            onClick={() => connect()}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-brand-1 to-brand-2 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Iniciando sessão do CFO...
              </>
            ) : (
              "Iniciar sessão de voz com o CFO"
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-all duration-200"
          >
            Encerrar sessão
          </button>
        )}

        {error && (
          <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
            {error}
          </p>
        )}

        {session && (
          <p className="text-[10px] text-slate-400">
            Sessão ativa para o tenant{" "}
            <span className="font-mono">{session.tenantId}</span>. A voz ainda
            usa o fluxo atual de STT/TTS, mas o CFO já está rodando em modo
            Live nos bastidores.
          </p>
        )}
      </div>

      {/* Quando a sessão está ativa, reaproveitamos o VoicePanel atual */}
      {isConnected && (
        <div className="mt-2">
          <VoicePanel tenantId={tenantId} plan={plan ?? "cfo"} />
        </div>
      )}
    </section>
  );
}
