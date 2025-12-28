import { db } from "src/services/firebase";
// src/contracts/analytics.ts
import { z } from "zod";

export const FilterSchema = z.object({
  from: z.string().nullable().optional(),
  to: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  type: z.enum(["credit","debit"]).nullable().optional(),
  card: z.string().nullable().optional(),
  q: z.string().nullable().optional()
});

export type FilterDto = z.infer<typeof FilterSchema>;

export const ForecastResponseSchema = z.object({
  kpis: z.object({
    balance: z.number().nullable().optional(),
    income: z.number().nullable().optional(),
    expense: z.number().nullable().optional(),
    balanceTrend: z.string().nullable().optional(),
    incomeTrend: z.string().nullable().optional(),
    expenseTrend: z.string().nullable().optional(),
  }),
  charts: z.object({
    months: z.array(z.string()),
    incomeSeries: z.array(z.number()),
    expenseSeries: z.array(z.number()),
    categories: z.array(z.object({
      category: z.string(),
      amount: z.number()
    }))
  }),
  meta: z.object({
    categories: z.array(z.string()),
    cards: z.array(z.string())
  })
});

export type ForecastResponse = z.infer<typeof ForecastResponseSchema>;



