// src/context/FeatureGateContext.tsx
import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import type { PlanKey } from "@/config/featureMap";
import { featureMap, defaultVoiceProfiles } from "@/config/featureMap";
import type { VoiceProfiles, VoiceTier } from "@/types/voice";
import { adminBootstrap } from "@/services/adminApi";

export type FeatureFlags = {
  voiceTTS: boolean;   // habilita "Ouvir resposta" (TTS)
  voiceSTT: boolean;   // habilita "Falar pergunta" (STT / microfone)
  supportDock: boolean; // habilita o dock de suporte
  advisorDock: boolean; // habilita o dock do Advisor/CFO virtual
  voiceTier: VoiceTier;
  analytics: boolean;
  pulse: boolean;
  simulate: boolean;
  advisor: boolean;
  support: boolean;
};

export type EmergencyFlags = {
  killAllVoice: boolean;
  killAdvisor: boolean;
  killSupport: boolean;
  maintenance: boolean;
};

type FeatureGateContextValue = {
  tenantId: string | null;
  plan: PlanKey;
  setPlan: (p: PlanKey) => void;
  features: FeatureFlags;
  emergency: EmergencyFlags;
  setEmergency: (e: Partial<EmergencyFlags>) => void;
  voiceProfiles: VoiceProfiles;
  setVoiceProfiles: (v: VoiceProfiles) => void;
};

const defaultEmergency: EmergencyFlags = {
  killAllVoice: false,
  killAdvisor: false,
  killSupport: false,
  maintenance: false,
};

const FeatureGateContext = createContext<FeatureGateContextValue | undefined>(undefined);

type FeatureGateProviderProps = {
  children: ReactNode;
};

export function FeatureGateProvider({
  children,
}: FeatureGateProviderProps) {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanKey>("starter");
  const [emergency, setEmergencyInternal] = useState<EmergencyFlags>(defaultEmergency);
  const [voiceProfiles, setVoiceProfiles] = useState<VoiceProfiles>(defaultVoiceProfiles);

  // Carrega configurações iniciais (admin bootstrap)
  useEffect(() => {
    async function init() {
      const data = await adminBootstrap();
      if (data.tenant) setTenantId(data.tenant);
      if (data.plan) setPlan(data.plan);
      if (data.emergency) setEmergencyInternal(data.emergency);
      if (data.voice) setVoiceProfiles(data.voice);
    }
    init();
  }, []);

  const features = useMemo(() => {
    const base = featureMap[plan];

    // Aplica kill-switches de emergência por cima do plano
    return {
      ...base,
      voiceTTS: base.voiceTTS && !emergency.killAllVoice,
      voiceSTT: base.voiceSTT && !emergency.killAllVoice,
      advisorDock: base.advisor && !emergency.killAdvisor,
      supportDock: base.support && !emergency.killSupport,
    };
  }, [plan, emergency]);

  const setEmergency = (patch: Partial<EmergencyFlags>) => {
    setEmergencyInternal(prev => ({ ...prev, ...patch }));
  };

  const value = useMemo(() => ({
    tenantId,
    plan,
    setPlan,
    features,
    emergency,
    setEmergency,
    voiceProfiles,
    setVoiceProfiles,
  }), [tenantId, plan, features, emergency, voiceProfiles]);

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug("[FeatureGate] State:", value);
  }

  return (
    <FeatureGateContext.Provider value={value}>
      {children}
    </FeatureGateContext.Provider>
  );
}

/**
 * Hook para acessar as flags e estados globais do Momentum.
 */
export function useFeatures(): FeatureGateContextValue {
  const ctx = useContext(FeatureGateContext);
  if (!ctx) {
    throw new Error("useFeatures must be used within FeatureGateProvider");
  }
  return ctx;
}
