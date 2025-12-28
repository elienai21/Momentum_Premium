import { db } from "src/services/firebase";
import { z } from "zod";

export const AccountSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["payable", "receivable"]),
  description: z.string().min(3),
  amount: z.number().positive(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  method: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
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


