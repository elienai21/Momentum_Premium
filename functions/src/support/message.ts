// functions/src/support/message.ts
// Modelo de mensagem de suporte (chat)

import { z } from "zod";
import {
  SupportSenderTypeSchema,
  SupportChannelSchema,
} from "./types";

export const SupportMessageSchema = z.object({
  id: z.string().optional(),

  tenantId: z.string(),
  ticketId: z.string(),       // referenciado em SupportTicket
  sessionId: z.string().optional(), // se houver sessão de chat

  senderType: SupportSenderTypeSchema, // "user" | "agent" | "ai" | "system"
  senderId: z.string().optional(),     // uid do usuário / agente
  senderName: z.string().optional(),

  channel: SupportChannelSchema.default("in_app"),

  content: z.string().min(1), // mensagem em texto
  // para anexos futuros: urls, tipo de arquivo, etc.
  attachments: z
    .array(
      z.object({
        url: z.string(),
        type: z.string().optional(),
        name: z.string().optional(),
      })
    )
    .default([]),

  // flags
  internal: z.boolean().default(false), // nota interna visível só para agente
  visibleToUser: z.boolean().default(true),

  createdAt: z.string(), // ISO
});

export type SupportMessage = z.infer<typeof SupportMessageSchema>;

/**
 * Helper para construir uma nova mensagem, garantindo defaults.
 */
export function buildNewMessage(input: {
  tenantId: string;
  ticketId: string;
  sessionId?: string;
  senderType: z.infer<typeof SupportSenderTypeSchema>;
  senderId?: string;
  senderName?: string;
  content: string;
  channel?: z.infer<typeof SupportChannelSchema>;
  internal?: boolean;
  visibleToUser?: boolean;
  attachments?: { url: string; type?: string; name?: string }[];
}): SupportMessage {
  const now = new Date().toISOString();

  return {
    tenantId: input.tenantId,
    ticketId: input.ticketId,
    sessionId: input.sessionId,
    senderType: input.senderType,
    senderId: input.senderId,
    senderName: input.senderName,
    channel: input.channel ?? "in_app",
    content: input.content,
    attachments: input.attachments ?? [],
    internal: input.internal ?? false,
    visibleToUser:
      input.visibleToUser ?? !input.internal, // se for interna, por padrão não é visível
    createdAt: now,
  };
}
