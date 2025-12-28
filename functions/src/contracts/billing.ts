import { db } from "src/services/firebase";
import { z } from "zod";

export const BillingUsageSchema = z.object({
  tokens: z.number().min(1),
  subscriptionItemId: z.string().min(5)
});

export const BillingResponseSchema = z.object({
  ok: z.boolean(),
  status: z.string(),
  billedTokens: z.number().optional(),
});

export type BillingUsageDto = z.infer<typeof BillingUsageSchema>;
export type BillingResponseDto = z.infer<typeof BillingResponseSchema>;



