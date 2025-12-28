"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingResponseSchema = exports.BillingUsageSchema = void 0;
const zod_1 = require("zod");
exports.BillingUsageSchema = zod_1.z.object({
    tokens: zod_1.z.number().min(1),
    subscriptionItemId: zod_1.z.string().min(5)
});
exports.BillingResponseSchema = zod_1.z.object({
    ok: zod_1.z.boolean(),
    status: zod_1.z.string(),
    billedTokens: zod_1.z.number().optional(),
});
