import { db } from "src/services/firebase";
import { z } from "zod";

export const AccountSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  amount: z.number(),
  dueDate: z.string(),
  status: z.enum(["pending","paid","under_review"]).default("pending"),
});

export const AccountUpdateSchema = AccountSchema.partial().extend({
  id: z.string(),
});

export const AccountResponseSchema = z.object({
  ok: z.boolean(),
  account: AccountSchema.optional(),
  message: z.string().optional(),
});

export type AccountDto = z.infer<typeof AccountSchema>;
export type AccountUpdateDto = z.infer<typeof AccountUpdateSchema>;
export type AccountResponseDto = z.infer<typeof AccountResponseSchema>;



