import { useState } from "react";
import { useFeatures } from "@/context/FeatureGateContext";
import { adminSaveSupportConfig } from "@/services/adminApi";

export default function AdminSupport() {
  const { tenantId, features } = useFeatures();
  const [collection, setCollection] = useState("knowledge-base/main");
  const [temperature, setTemperature] = useState(0.3);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try { await adminSaveSupportConfig(tenantId, { collection, temperature }); }
    finally { setSaving(false); }
  }

  return (
    <section className="space-y-4">
      <div className="text-sm">SupportDock: {features.support ? "habilitado" : "desabilitado (plano/kill-switch)"}</div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1 text-sm">
          <label className="block">Fonte/coleção</label>
          <input className="w-full border rounded-lg px-2 py-1" value={collection} onChange={e=>setCollection(e.target.value)} />
        </div>
        <div className="space-y-1 text-sm">
          <label className="block">Temperatura (0–1)</label>
          <input type="number" min={0} max={1} step={0.1} className="w-full border rounded-lg px-2 py-1"
                 value={temperature} onChange={e=>setTemperature(Number(e.target.value))} />
        </div>
      </div>

      <button onClick={save} disabled={saving} className="border px-3 py-2 rounded-xl text-sm hover:bg-slate-50">
        {saving ? "Salvando..." : "Salvar configuração de suporte"}
      </button>
    </section>
  );
}
