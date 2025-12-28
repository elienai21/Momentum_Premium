// functions/src/support/session.ts
// Modelo de sessão de suporte (thread de atendimento)

import { z } from "zod";
import {
  SupportStatusSchema,
  SupportChannelSchema,
} from "./types";

export const SupportSessionSchema = z.object({
  id: z.string().optional(),

  tenantId: z.string(),
  userId: z.string(),         // usuário atendido
  ticketId: z.string().optional(), // se a sessão está vinculada a um ticket

  channel: SupportChannelSchema.default("in_app"),

  status: SupportStatusSchema.default("open"),

  // Resumo da sessão / assunto
  subject: z.string().optional(),

  // Dados de IA / fluxo
  aiEnabled: z.boolean().default(true),
  lastAiTurnAt: z.string().optional(),

  // Métricas simples
  messageCount: z.number().int().nonnegative().default(0),
  aiMessageCount: z.number().int().nonnegative().default(0),
  agentMessageCount: z.number().int().nonnegative().default(0),

  // Datas (ISO)
  createdAt: z.string(),
  updatedAt: z.string(),
  closedAt: z.string().optional(),
  lastActivityAt: z.string().optional(),

  // Auditoria
  createdBy: z.string().optional(), // uid de quem abriu (pode ser system)
  updatedBy: z.string().optional(),
});

export type SupportSession = z.infer<typeof SupportSessionSchema>;

/**
 * Helper para construir uma nova sessão de suporte.
 */
export function buildNewSession(input: {
  tenantId: string;
  userId: string;
  ticketId?: string;
  channel?: z.infer<typeof SupportChannelSchema>;
  subject?: string;
  createdBy?: string;
}): SupportSession {
  const now = new Date().toISOString();

  return {
    tenantId: input.tenantId,
    userId: input.userId,
    ticketId: input.ticketId,
    channel: input.channel ?? "in_app",
    status: "open",
    subject: input.subject,
    aiEnabled: true,
    messageCount: 0,
    aiMessageCount: 0,
    agentMessageCount: 0,
    createdAt: now,
    updatedAt: now,
    createdBy: input.createdBy,
    updatedBy: input.createdBy,
  };
}
