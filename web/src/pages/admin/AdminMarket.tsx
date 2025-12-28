// web/src/pages/admin/AdminMarket.tsx
// Console do Admin para configurar o MarketConfig do tenant.
// Rotas: dentro de /admin → <Route path="market" element={<AdminMarket />} />
//
// Requisitos: useMarketConfig(tenantId) já criado.

import React, { useEffect, useMemo, useState } from "react";
import { useMarketConfig, type MarketConfig, type Horizon } from "../../hooks/useMarketConfig";
import { useNavigate } from "react-router-dom";

function resolveTenantId(): string {
  // Ajuste para sua auth/tenant real
  const fromWindow = (window as any)?.TENANT_ID as string | undefined;
  const fromStorage = localStorage.getItem("tenantId") || undefined;
  return fromWindow || fromStorage || "T1";
}

type FormState = {
  enabled: boolean;
  sector: string;
  region: string;
  companySize: string;
  horizon: Horizon;
};

const defaultState: FormState = {
  enabled: true,
  sector: "",
  region: "",
  companySize: "",
  horizon: "90d",
};

export default function AdminMarket() {
  const navigate = useNavigate();
  const tenantId = resolveTenantId();

  const { data, isLoading, error, save, isSaving, refetch } = useMarketConfig(tenantId);

  const initial = useMemo<FormState>(() => {
    const base: MarketConfig | undefined = data;
    return {
      enabled: base?.enabled ?? true,
      sector: base?.sector ?? "",
      region: base?.region ?? "",
      companySize: base?.companySize ?? "",
      horizon: (base?.horizon as Horizon) ?? "90d",
    };
  }, [data]);

  const [form, setForm] = useState<FormState>(defaultState);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});

  useEffect(() => {
    setForm(initial);
  }, [initial]);

  const onChange =
    (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value =
        e.target.type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : e.target.value;
      setForm((prev) => ({ ...prev, [field]: value } as FormState));
    };

  const onBlur = (field: keyof FormState) => () =>
    setTouched((t) => ({ ...t, [field]: true }));

  const hasErr = (f: keyof FormState) => {
    if (!touched[f]) return false;
    if (f === "sector" || f === "region" || f === "companySize") {
      return (form[f] as string).trim().length === 0;
    }
    return false;
  };

  const canSubmit =
    form.sector.trim().length > 0 &&
    form.region.trim().length > 0 &&
    form.companySize.trim().length > 0 &&
    !isSaving;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setTouched({
      sector: true,
      region: true,
      companySize: true,
      enabled: true,
      horizon: true,
    });
    setMsg({});
    if (!canSubmit) return;

    try {
      await save({
        enabled: form.enabled,
        sector: form.sector.trim(),
        region: form.region.trim(),
        companySize: form.companySize.trim(),
        horizon: form.horizon,
      });
      setMsg({ ok: "Configuração salva com sucesso." });
      // ressincroniza cache
      void refetch();
    } catch (err: any) {
      setMsg({ err: err?.message?.toString?.() || "Não foi possível salvar." });
    }
  }

  function handleReload() {
    setMsg({});
    void refetch();
  }

  return (
    <main className="pt-16 p-6 max-w-4xl mx-auto" aria-labelledby="adm-market-title">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[rgba(14,18,28,0.65)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 id="adm-market-title" className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Admin · Perfil de Mercado
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Controle central do conselheiro de mercado para o tenant <span className="font-semibold">{tenantId}</span>.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => navigate("/onboarding")}
              className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              title="Abrir Onboarding"
            >
              Onboarding
            </button>
            <button
              type="button"
              onClick={handleReload}
              className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              title="Recarregar"
            >
              Recarregar
            </button>
          </div>
        </div>
      </header>

      {/* estados globais */}
      {isLoading && (
        <div
          role="status"
          className="mt-4 h-0.5 w-full bg-gradient-to-r from-brand-1 via-brand-2 to-brand-1 animate-pulse"
          aria-label="Carregando MarketConfig"
        />
      )}
      {error && (
        <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Não foi possível carregar a configuração. Tente recarregar.
        </div>
      )}
      {msg.ok && (
        <div role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {msg.ok}
        </div>
      )}
      {msg.err && (
        <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {msg.err}
        </div>
      )}

      <form
        onSubmit={handleSave}
        className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[rgba(14,18,28,0.65)]"
        noValidate
      >
        {/* enabled */}
        <div className="mb-4">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              checked={form.enabled}
              onChange={onChange("enabled")}
              onBlur={onBlur("enabled")}
              aria-describedby="enabled-help"
            />
            Ativar conselheiro de mercado para este tenant
          </label>
          <p id="enabled-help" className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Quando desativado, as rotas de mercado ficam indisponíveis mesmo com créditos.
          </p>
        </div>

        {/* sector */}
        <div className="mb-4">
          <label htmlFor="sector" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Setor <span className="text-rose-600">*</span>
          </label>
          <input
            id="sector"
            type="text"
            value={form.sector}
            onChange={onChange("sector")}
            onBlur={onBlur("sector")}
            className={`mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 dark:bg-slate-900 dark:text-slate-100 ${
              hasErr("sector")
                ? "border-rose-300 focus:border-rose-400 focus:ring-rose-400"
                : "border-slate-300 focus:border-sky-400 focus:ring-sky-400"
            }`}
            placeholder="Ex.: varejo, serviços, saúde…"
            required
          />
          {hasErr("sector") && <p className="mt-1 text-xs text-rose-700">Informe o setor.</p>}
        </div>

        {/* region */}
        <div className="mb-4">
          <label htmlFor="region" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Região <span className="text-rose-600">*</span>
          </label>
          <input
            id="region"
            type="text"
            value={form.region}
            onChange={onChange("region")}
            onBlur={onBlur("region")}
            className={`mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 dark:bg-slate-900 dark:text-slate-100 ${
              hasErr("region")
                ? "border-rose-300 focus:border-rose-400 focus:ring-rose-400"
                : "border-slate-300 focus:border-sky-400 focus:ring-sky-400"
            }`}
            placeholder="Ex.: SP, BR-Sudeste, Nordeste…"
            required
          />
          {hasErr("region") && <p className="mt-1 text-xs text-rose-700">Informe a região.</p>}
        </div>

        {/* companySize */}
        <div className="mb-4">
          <label htmlFor="companySize" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Porte da empresa <span className="text-rose-600">*</span>
          </label>
          <select
            id="companySize"
            value={form.companySize}
            onChange={onChange("companySize")}
            onBlur={onBlur("companySize")}
            className={`mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 outline-none transition dark:bg-slate-900 dark:text-slate-100 ${
              hasErr("companySize")
                ? "border-rose-300 focus:border-rose-400 focus:ring-rose-400"
                : "border-slate-300 focus:border-sky-400 focus:ring-sky-400"
            }`}
            required
          >
            <option value="" disabled>Selecione…</option>
            <option value="MEI">MEI</option>
            <option value="ME">ME</option>
            <option value="EPP">EPP</option>
            <option value="PME">PME</option>
            <option value="Enterprise">Enterprise</option>
          </select>
          {hasErr("companySize") && <p className="mt-1 text-xs text-rose-700">Selecione o porte.</p>}
        </div>

        {/* horizon */}
        <div className="mb-4">
          <label htmlFor="horizon" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Horizonte de análise
          </label>
          <select
            id="horizon"
            value={form.horizon}
            onChange={onChange("horizon")}
            onBlur={onBlur("horizon")}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-sky-400 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="30d">30 dias</option>
            <option value="90d">90 dias</option>
          </select>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Ajusta o horizonte temporal usado para consolidação de sinais e projeções.
          </p>
        </div>

        {/* Ações */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-500"
          >
            {isSaving ? "Salvando..." : "Salvar"}
          </button>
          <button
            type="button"
            onClick={handleReload}
            className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            Recarregar
          </button>
        </div>
      </form>
    </main>
  );
}
