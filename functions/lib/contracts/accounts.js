"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountResponseSchema = exports.AccountUpdateSchema = exports.AccountSchema = void 0;
const zod_1 = require("zod");
exports.AccountSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    name: zod_1.z.string().min(2),
    amount: zod_1.z.number(),
    dueDate: zod_1.z.string(),
    status: zod_1.z.enum(["pending", "paid", "under_review"]).default("pending"),
});
exports.AccountUpdateSchema = exports.AccountSchema.partial().extend({
    id: zod_1.z.string(),
});
exports.AccountResponseSchema = zod_1.z.object({
    ok: zod_1.z.boolean(),
    account: exports.AccountSchema.optional(),
    message: zod_1.z.string().optional(),
});
