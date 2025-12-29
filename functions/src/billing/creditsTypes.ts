// functions/src/billing/creditsTypes.ts

/**
 * Planos atualmente suportados comercialmente.
 *
 * Enterprise/white-label fica reservado para uma fase futura.
 */
export type PlanId = "starter" | "pro" | "premium_lite" | "business";

/**
 * Tier de plano usada em alguns serviços legados.
 * Preferir usar PlanId sempre que possível.
 */
export type PlanTier = PlanId | "cfo" | "premium_pro" | string;

export interface TenantCredits {
  /**
   * Créditos de IA "genéricos" (texto: CFO, advisor, suporte, etc.).
   */
  available: number;

  /**
   * Cota mensal de créditos de IA genéricos.
   */
  monthlyQuota: number;

  /**
   * Data/hora do último reset de créditos (ISO string ou null se nunca resetou).
   */
  lastResetAt: string | null;

  /**
   * Créditos específicos para voz premium/neural (TTS de alta qualidade).
   * Quando ausente, tratar como 0.
   */
  voicePremiumAvailable?: number;

  /**
   * Cota mensal de créditos de voz premium/neural.
   */
  voicePremiumMonthlyQuota?: number;

  /**
   * Última atualização do registro (ISO string).
   */
  updatedAt?: string;
}

export interface CreditsState extends TenantCredits {
  /**
   * Créditos de IA genéricos já utilizados no ciclo atual.
   */
  used: number;

  /**
   * Data/hora em que os créditos serão renovados (ISO string).
   */
  renewsAt: string;

  /**
   * Créditos de voz premium já utilizados no ciclo atual.
   */
  voicePremiumUsed?: number;

  /**
   * Plano normalizado (ex.: starter, pro, etc.)
   */
  planNormalized: string;

  /**
   * Origem do período de renovação (stripe ou fallback)
   */
  periodSource: "stripe" | "fallback";
}
