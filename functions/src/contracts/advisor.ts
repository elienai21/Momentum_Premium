import { db } from "src/services/firebase";
import { z } from "zod";

export const AdvisorPromptSchema = z.object({
  message: z.string().min(2, "Mensagem vazia"),
});

export const AdvisorReplySchema = z.object({
  answer: z.string(),
  actions: z.array(z.object({
    name: z.string(),
    args: z.record(z.any()).optional(),
    confirmText: z.string().optional()
  })).optional(),
  voice: z.boolean().optional()
});

export type AdvisorPromptDto = z.infer<typeof AdvisorPromptSchema>;
export type AdvisorReplyDto = z.infer<typeof AdvisorReplySchema>;



