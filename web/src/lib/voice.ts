import type { VoiceTier, VoiceProfiles } from "@/types/voice";

/** Fallbacks por tier caso não haja profile específico configurado */
export function defaultVoiceForTier(tier: VoiceTier, context: "advisor" | "support") {
  if (tier === "neural_premium") return context === "advisor" ? "pt-BR-Neural-Premium-Advisor" : "pt-BR-Neural-Premium-Tutorial";
  if (tier === "neural")         return context === "advisor" ? "pt-BR-Neural-Advisor"        : "pt-BR-Neural-Tutorial";
  return                                context === "advisor" ? "pt-BR-Standard-A"            : "pt-BR-Standard-B";
}

/** Resolve a voz final considerando tier e override de profile */
export function resolveVoiceId(tier: VoiceTier, profiles: VoiceProfiles, context: "advisor"|"support") {
  const custom = profiles[context]?.voiceId;
  if (custom && custom.trim().length > 0) return custom.trim();
  return defaultVoiceForTier(tier, context);
}
