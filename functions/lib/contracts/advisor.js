"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdvisorReplySchema = exports.AdvisorPromptSchema = void 0;
const zod_1 = require("zod");
exports.AdvisorPromptSchema = zod_1.z.object({
    message: zod_1.z.string().min(2, "Mensagem vazia"),
});
exports.AdvisorReplySchema = zod_1.z.object({
    answer: zod_1.z.string(),
    actions: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        args: zod_1.z.record(zod_1.z.any()).optional(),
        confirmText: zod_1.z.string().optional()
    })).optional(),
    voice: zod_1.z.boolean().optional()
});
