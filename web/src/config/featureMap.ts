import type { VoiceTier, VoiceProfiles } from "@/types/voice";

export const featureMap = {
  starter: {
    pulse: true,
    simulate: true,
    advisor: true,
    support: true,
    voiceTTS: true,
    voiceSTT: true,
    // 👇 qualidade de voz do plano (mais "robótica"/básica)
    voiceTier: "standard" as VoiceTier,
    analytics: false,
  },
  pro: {
    pulse: true,
    simulate: true,
    advisor: true,
    support: true,
    voiceTTS: true,
    voiceSTT: true,
    // 👇 voz neural/premium como padrão
    voiceTier: "neural_premium" as VoiceTier,
    analytics: false,
  },
  business: {
    pulse: true,
    simulate: true,
    advisor: true,
    support: true,
    voiceTTS: true,
    voiceSTT: true,
    // 👇 voz neural/premium + analytics avançado
    voiceTier: "neural_premium" as VoiceTier,
    analytics: true,
  },
  enterprise: {
    // Reservado para fase futura (white-label, etc.)
    pulse: true,
    simulate: true,
    advisor: true,
    support: true,
    voiceTTS: true,
    voiceSTT: true,
    voiceTier: "neural_premium" as VoiceTier,
    analytics: true,
  },
} as const;

export type PlanKey = keyof typeof featureMap;

export const defaultVoiceProfiles: VoiceProfiles = {
  advisor: { tier: "standard", voiceId: "pt-BR-Standard-A" },
  support: { tier: "standard", voiceId: "pt-BR-Standard-B" },
};
