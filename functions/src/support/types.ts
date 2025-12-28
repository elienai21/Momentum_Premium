// functions/src/support/types.ts
// Tipos base compartilhados pelo módulo de suporte

import { z } from "zod";

// Prioridade do ticket / sessão
export const SupportPrioritySchema = z.enum([
  "low",
  "medium",
  "high",
  "urgent",
]);
export type SupportPriority = z.infer<typeof SupportPrioritySchema>;

// Status de ticket/sessão de suporte
export const SupportStatusSchema = z.enum([
  "open",
  "in_progress",
  "waiting_user",
  "escalated",
  "resolved",
  "closed",
  "cancelled",
]);
export type SupportStatus = z.infer<typeof SupportStatusSchema>;

// Canal de origem da interação
export const SupportChannelSchema = z.enum([
  "in_app",
  "email",
  "whatsapp",
  "voice",
  "other",
]);
export type SupportChannel = z.infer<typeof SupportChannelSchema>;

// Tipo de remetente da mensagem
export const SupportSenderTypeSchema = z.enum([
  "user",
  "agent",
  "ai",
  "system",
]);
export type SupportSenderType = z.infer<typeof SupportSenderTypeSchema>;

// Tipo de ticket (categoria macro)
export const SupportCategorySchema = z.enum([
  "billing",
  "technical",
  "product",
  "training",
  "data",
  "other",
]);
export type SupportCategory = z.infer<typeof SupportCategorySchema>;
