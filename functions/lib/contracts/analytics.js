"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForecastResponseSchema = exports.FilterSchema = void 0;
// src/contracts/analytics.ts
const zod_1 = require("zod");
exports.FilterSchema = zod_1.z.object({
    from: zod_1.z.string().nullable().optional(),
    to: zod_1.z.string().nullable().optional(),
    category: zod_1.z.string().nullable().optional(),
    type: zod_1.z.enum(["credit", "debit"]).nullable().optional(),
    card: zod_1.z.string().nullable().optional(),
    q: zod_1.z.string().nullable().optional()
});
exports.ForecastResponseSchema = zod_1.z.object({
    kpis: zod_1.z.object({
        balance: zod_1.z.number().nullable().optional(),
        income: zod_1.z.number().nullable().optional(),
        expense: zod_1.z.number().nullable().optional(),
        balanceTrend: zod_1.z.string().nullable().optional(),
        incomeTrend: zod_1.z.string().nullable().optional(),
        expenseTrend: zod_1.z.string().nullable().optional(),
    }),
    charts: zod_1.z.object({
        months: zod_1.z.array(zod_1.z.string()),
        incomeSeries: zod_1.z.array(zod_1.z.number()),
        expenseSeries: zod_1.z.array(zod_1.z.number()),
        categories: zod_1.z.array(zod_1.z.object({
            category: zod_1.z.string(),
            amount: zod_1.z.number()
        }))
    }),
    meta: zod_1.z.object({
        categories: zod_1.z.array(zod_1.z.string()),
        cards: zod_1.z.array(zod_1.z.string())
    })
});
