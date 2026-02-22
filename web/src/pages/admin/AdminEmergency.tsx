import { useState } from "react";
import { useFeatures } from "@/context/FeatureGateContext";
import { adminSaveEmergency } from "@/services/adminApi";

export default function AdminEmergency() {
  const { tenantId, emergency, setEmergency } = useFeatures();
  const [saving, setSaving] = useState(false);

  function toggle(k: keyof typeof emergency) {
    setEmergency({ [k]: !emergency[k] });
  }

  async function save() {
    setSaving(true);
    try { await adminSaveEmergency(tenantId!, emergency); }
    finally { setSaving(false); }
  }

  return (
    <section className="space-y-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <label className="border rounded-xl p-3 text-sm flex items-center gap-2">
          <input type="checkbox" checked={emergency.killAllVoice} onChange={() => toggle("killAllVoice")} /> Desligar TODA voz
        </label>
        <label className="border rounded-xl p-3 text-sm flex items-center gap-2">
          <input type="checkbox" checked={emergency.killAdvisor} onChange={() => toggle("killAdvisor")} /> Desligar Advisor
        </label>
        <label className="border rounded-xl p-3 text-sm flex items-center gap-2">
          <input type="checkbox" checked={emergency.killSupport} onChange={() => toggle("killSupport")} /> Desligar Suporte
        </label>
        <label className="border rounded-xl p-3 text-sm flex items-center gap-2">
          <input type="checkbox" checked={emergency.maintenance} onChange={() => toggle("maintenance")} /> Manutenção (banner)
        </label>
      </div>

      <button onClick={save} disabled={saving} className="border px-3 py-2 rounded-xl text-sm hover:bg-slate-50">
        {saving ? "Salvando..." : "Salvar emergência"}
      </button>
      <p className="text-xs text-slate-500">Kill-switches aplicam efeito imediato no front; persista para refletir no back.</p>
    </section>
  );
}
