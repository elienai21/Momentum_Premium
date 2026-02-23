// web/src/pages/Onboarding.tsx
// Onboarding simples para configurar o perfil de mercado do tenant.
// Usa o hook useMarketConfig(tenantId) para GET/PUT em /api/admin/tenant/:tenantId/market-config
// Rota registrada em App.tsx: <Route path="/onboarding" element={<Onboarding />} />
//
// UI/UX: foco em clareza, acessibilidade e compatibilidade com a Topbar fixa (pt-16).

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMarketConfig, type MarketConfig, type Horizon } from "../hooks/useMarketConfig";
import { useTenant } from "../context/TenantContext";

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

export default function Onboarding() {
  const navigate = useNavigate();
  const { tenantId } = useTenant();

  if (!tenantId) {
    return (
      <main className="pt-16 mx-auto max-w-3xl p-6">
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Ambiente n&atilde;o configurado. Fa&ccedil;a login novamente para continuar.
        </div>
      </main>
    );
  }

  const { data, isLoading, error, save, isSaving } = useMarketConfig(tenantId);

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
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitOk, setSubmitOk] = useState<boolean>(false);

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

  const hasError = (field: keyof FormState) => {
    if (!touched[field]) return false;
    if (field === "sector" || field === "region" || field === "companySize") {
      return (form[field] as string).trim().length === 0;
    }
    return false;
  };

  const canSubmit =
    form.sector.trim().length > 0 &&
    form.region.trim().length > 0 &&
    form.companySize.trim().length > 0 &&
    !isSaving;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({
      sector: true,
      region: true,
      companySize: true,
      enabled: true,
      horizon: true,
    });
    setSubmitError(null);
    setSubmitOk(false);

    if (!canSubmit) return;

    try {
      await save({
        enabled: form.enabled,
        sector: form.sector.trim(),
        region: form.region.trim(),
        companySize: form.companySize.trim(),
        horizon: form.horizon,
      });
      setSubmitOk(true);
      // Pequeno atraso para feedback visual, depois redireciona para o fluxo de importação
      setTimeout(() => navigate("/imports", { state: { fromOnboarding: true } }), 400);
    } catch (err: any) {
      setSubmitError(
        err?.message?.toString?.() || "Não foi possível salvar. Tente novamente."
      );
    }
  }

  return (
    <main
      className="pt-16 mx-auto max-w-3xl p-6"
      aria-labelledby="onb-title"
      aria-describedby="onb-sub"
    >
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[rgba(14,18,28,0.65)]">
        <h1 id="onb-title" className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Onboarding — Perfil de Mercado
        </h1>
        <p id="onb-sub" className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Conte um pouco sobre o seu negócio. Isso ajuda o CFO e o Conselheiro de Mercado a
          produzirem recomendações sob medida para o seu segmento e região.
        </p>
      </header>

      {/* Estados globais */}
      {isLoading && (
        <div
          role="status"
          className="mt-4 h-0.5 w-full bg-gradient-to-r from-brand-1 via-brand-2 to-brand-1 animate-pulse"
          aria-label="Carregando dados do perfil de mercado"
        />
      )}
      {error && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          Não foi possível carregar seus dados. Tente atualizar a página.
        </div>
      )}

      <form
        onSubmit={handleSubmit}
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
            Ativar Conselheiro de Mercado para este tenant
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
              hasError("sector")
                ? "border-rose-300 focus:border-rose-400 focus:ring-rose-400"
                : "border-slate-300 focus:border-sky-400 focus:ring-sky-400"
            }`}
            placeholder="Ex.: varejo, serviços, saúde…"
            required
          />
          {hasError("sector") && (
            <p className="mt-1 text-xs text-rose-700">Informe o setor.</p>
          )}
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
              hasError("region")
                ? "border-rose-300 focus:border-rose-400 focus:ring-rose-400"
                : "border-slate-300 focus:border-sky-400 focus:ring-sky-400"
            }`}
            placeholder="Ex.: SP, BR-Sudeste, Nordeste…"
            required
          />
          {hasError("region") && (
            <p className="mt-1 text-xs text-rose-700">Informe a região.</p>
          )}
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
              hasError("companySize")
                ? "border-rose-300 focus:border-rose-400 focus:ring-rose-400"
                : "border-slate-300 focus:border-sky-400 focus:ring-sky-400"
            }`}
            required
          >
            <option value="" disabled>
              Selecione…
            </option>
            <option value="MEI">MEI</option>
            <option value="ME">ME</option>
            <option value="EPP">EPP</option>
            <option value="PME">PME</option>
            <option value="Enterprise">Enterprise</option>
          </select>
          {hasError("companySize") && (
            <p className="mt-1 text-xs text-rose-700">Selecione o porte.</p>
          )}
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
            aria-disabled={!canSubmit}
          >
            {isSaving ? "Salvando..." : "Concluir"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>

          {submitOk && (
            <span className="ml-2 text-sm text-emerald-700 dark:text-emerald-300" role="status">
              Configuração salva!
            </span>
          )}
        </div>

        {/* Mensagens de erro de submissão */}
        {submitError && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {submitError}
          </div>
        )}
      </form>
    </main>
  );
}
