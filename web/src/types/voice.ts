export type VoiceTier = "standard" | "neural" | "neural_premium";

export type VoiceProfiles = {
  advisor: { tier: VoiceTier; voiceId: string }; // ex: "pt-BR-Standard-A" | "pt-BR-Neural-Advisor"
  support: { tier: VoiceTier; voiceId: string }; // ex: "pt-BR-Standard-B" | "pt-BR-Neural-Tutorial"
};
