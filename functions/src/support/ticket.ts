// functions/src/support/ticket.ts
// Modelo de ticket de suporte

import { z } from "zod";
import {
  SupportPrioritySchema,
  SupportStatusSchema,
  SupportChannelSchema,
  SupportCategorySchema,
} from "./types";

export const SupportTicketSchema = z.object({
  id: z.string().optional(), // id do documento no Firestore

  tenantId: z.string(),      // tenant dono do ticket
  userId: z.string(),        // usuário que abriu (uid)
  email: z.string().email().optional(),
  displayName: z.string().optional(),

  subject: z.string().min(3),
  category: SupportCategorySchema.default("other"),
  status: SupportStatusSchema.default("open"),
  priority: SupportPrioritySchema.default("medium"),

  channel: SupportChannelSchema.default("in_app"),

  // tags adicionais livres, ex.: ["cfo", "pulse", "bug"]
  tags: z.array(z.string()).default([]),

  // Última mensagem / atividade
  lastMessageAt: z.string().optional(),
  lastActorType: z.string().optional(), // "user" | "agent" | "ai" ...

  // Datas (ISO strings)
  createdAt: z.string(),
  updatedAt: z.string(),
  closedAt: z.string().optional(),

  // Campos de auditoria
  createdBy: z.string().optional(), // uid de quem criou (pode ser agente)
  updatedBy: z.string().optional(),
});

export type SupportTicket = z.infer<typeof SupportTicketSchema>;

/**
 * Helper para construir um novo ticket a partir de dados crus.
 * Útil no supportService.ts na hora de criar tickets.
 */
export function buildNewTicket(input: {
  tenantId: string;
  userId: string;
  email?: string;
  displayName?: string;
  subject: string;
  category?: z.infer<typeof SupportCategorySchema>;
  priority?: z.infer<typeof SupportPrioritySchema>;
  channel?: z.infer<typeof SupportChannelSchema>;
  tags?: string[];
  createdBy?: string;
}): SupportTicket {
  const now = new Date().toISOString();

  return {
    tenantId: input.tenantId,
    userId: input.userId,
    email: input.email,
    displayName: input.displayName,
    subject: input.subject,
    category: input.category ?? "other",
    status: "open",
    priority: input.priority ?? "medium",
    channel: input.channel ?? "in_app",
    tags: input.tags ?? [],
    createdAt: now,
    updatedAt: now,
    createdBy: input.createdBy,
    updatedBy: input.createdBy,
  };
}
