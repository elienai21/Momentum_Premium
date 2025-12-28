import { useState } from "react";
import { useFeatures } from "@/context/FeatureGateContext";
import type { VoiceTier } from "@/types/voice";
import { adminSaveVoice } from "@/services/adminApi";
import { resolveVoiceId } from "@/lib/voice";

export default function AdminVoice() {
  const { tenantId, features, voiceProfiles, setVoiceProfiles } = useFeatures();
  const [saving, setSaving] = useState(false);

  const tier: VoiceTier = features.voiceTier;

  function updateVoice(context: "advisor"|"support", patch: Partial<typeof voiceProfiles.advisor>) {
    setVoiceProfiles({
      advisor: context === "advisor" ? { ...voiceProfiles.advisor, ...patch } : voiceProfiles.advisor,
      support: context === "support" ? { ...voiceProfiles.support, ...patch } : voiceProfiles.support,
    });
  }

  async function save() {
    setSaving(true);
    try { await adminSaveVoice(tenantId, voiceProfiles); } finally { setSaving(false); }
  }

  const advisorResolved = resolveVoiceId(tier, voiceProfiles, "advisor");
  const supportResolved = resolveVoiceId(tier, voiceProfiles, "support");

  return (
    <section className="space-y-4">
      <div className="text-sm">Tier do plano: <b>{tier}</b></div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="border rounded-xl p-4 space-y-3">
          <div className="font-medium text-sm">Advisor — perfil de voz</div>
          <label className="block text-xs text-slate-600">Voice ID (override opcional)</label>
          <input className="w-full border rounded-lg px-2 py-1 text-sm"
                 placeholder="ex.: pt-BR-Neural-Advisor"
                 value={voiceProfiles.advisor.voiceId}
                 onChange={(e)=> updateVoice("advisor", { voiceId: e.target.value })}/>
          <div className="text-xs text-slate-500">Voz efetiva: <code>{advisorResolved}</code></div>
        </div>

        <div className="border rounded-xl p-4 space-y-3">
          <div className="font-medium text-sm">Suporte — perfil de voz</div>
          <label className="block text-xs text-slate-600">Voice ID (override opcional)</label>
          <input className="w-full border rounded-lg px-2 py-1 text-sm"
                 placeholder="ex.: pt-BR-Neural-Tutorial"
                 value={voiceProfiles.support.voiceId}
                 onChange={(e)=> updateVoice("support", { voiceId: e.target.value })}/>
          <div className="text-xs text-slate-500">Voz efetiva: <code>{supportResolved}</code></div>
        </div>
      </div>

      <button onClick={save} disabled={saving} className="border px-3 py-2 rounded-xl text-sm hover:bg-slate-50">
        {saving ? "Salvando..." : "Salvar perfis de voz"}
      </button>
      <p className="text-xs text-slate-500">Se o Voice ID estiver vazio, o app usará o default do tier.</p>
    </section>
  );
}
