import type { PlanKey } from "@/config/featureMap";
import type { VoiceProfiles } from "@/types/voice";
import authorizedFetch from "./authorizedFetch";

type BootstrapResponse = {
  tenant?: string;
  plan?: PlanKey;
  voice?: VoiceProfiles;
  emergency?: { killAllVoice: boolean; killAdvisor: boolean; killSupport: boolean; maintenance: boolean };
};

// Tenta carregar do BE; fallback vazio mantêm FE funcional
export async function adminBootstrap(): Promise<BootstrapResponse> {
  try {
    const r = await authorizedFetch("/api/admin/bootstrap");
    if (!r.ok) throw 0;
    return r.json();
  } catch {
    return {};
  }
}

export async function adminSavePlan(tenantId: string, plan: PlanKey) {
  const r = await authorizedFetch(`/api/admin/tenant/${encodeURIComponent(tenantId)}/plan`, {
    method: "PUT",
    body: { plan },
  });
  if (!r.ok) throw new Error("Falha ao salvar plano");
}

export async function adminSaveVoice(tenantId: string, voice: VoiceProfiles) {
  const r = await authorizedFetch(`/api/admin/tenant/${encodeURIComponent(tenantId)}/voice-profiles`, {
    method: "PUT",
    body: voice,
  });
  if (!r.ok) throw new Error("Falha ao salvar perfis de voz");
}

export async function adminSaveEmergency(tenantId: string, flags: BootstrapResponse["emergency"]) {
  const r = await authorizedFetch(`/api/admin/tenant/${encodeURIComponent(tenantId)}/emergency`, {
    method: "PUT",
    body: flags,
  });
  if (!r.ok) throw new Error("Falha ao salvar emergência");
}

export async function adminSaveSupportConfig(tenantId: string, cfg: { collection: string; temperature: number }) {
  const r = await authorizedFetch(`/api/admin/tenant/${encodeURIComponent(tenantId)}/support-config`, {
    method: "PUT",
    body: cfg,
  });
  if (!r.ok) throw new Error("Falha ao salvar suporte");
}
