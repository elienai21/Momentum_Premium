import { useState } from "react";
import { useFeatures } from "@/context/FeatureGateContext";
import type { PlanKey } from "@/config/featureMap";
import { adminSavePlan } from "@/services/adminApi";

export default function AdminPlans() {
  const { tenantId, plan, setPlan, features } = useFeatures();
  const plans: PlanKey[] = ["starter", "pro", "business", "enterprise"];
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try { await adminSavePlan(tenantId!, plan); } finally { setSaving(false); }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <label className="text-sm">Plano ativo</label>
        <select value={plan} onChange={(e) => setPlan(e.target.value as PlanKey)} className="border rounded-lg px-2 py-1 text-sm">
          {plans.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <button onClick={save} disabled={saving} className="border px-3 py-2 rounded-xl text-sm hover:bg-slate-50">
          {saving ? "Salvando..." : "Salvar plano"}
        </button>
      </div>

      <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
        {Object.entries(features).map(([k, v]) => (
          <li key={k} className="border rounded-xl p-3 flex items-center justify-between">
            <span>{k}</span>
            <span className={`text-xs ${v ? "text-emerald-700" : "text-slate-500"}`}>{v ? "ON" : "OFF"}</span>
          </li>
        ))}
      </ul>

      <p className="text-xs text-slate-500">Recurso efetivo após kill-switches. Persistência no BE recomendada.</p>
    </section>
  );
}
