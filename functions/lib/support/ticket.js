"use strict";
// functions/src/support/ticket.ts
// Modelo de ticket de suporte
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupportTicketSchema = void 0;
exports.buildNewTicket = buildNewTicket;
const zod_1 = require("zod");
const types_1 = require("./types");
exports.SupportTicketSchema = zod_1.z.object({
    id: zod_1.z.string().optional(), // id do documento no Firestore
    tenantId: zod_1.z.string(), // tenant dono do ticket
    userId: zod_1.z.string(), // usuário que abriu (uid)
    email: zod_1.z.string().email().optional(),
    displayName: zod_1.z.string().optional(),
    subject: zod_1.z.string().min(3),
    category: types_1.SupportCategorySchema.default("other"),
    status: types_1.SupportStatusSchema.default("open"),
    priority: types_1.SupportPrioritySchema.default("medium"),
    channel: types_1.SupportChannelSchema.default("in_app"),
    // tags adicionais livres, ex.: ["cfo", "pulse", "bug"]
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    // Última mensagem / atividade
    lastMessageAt: zod_1.z.string().optional(),
    lastActorType: zod_1.z.string().optional(), // "user" | "agent" | "ai" ...
    // Datas (ISO strings)
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string(),
    closedAt: zod_1.z.string().optional(),
    // Campos de auditoria
    createdBy: zod_1.z.string().optional(), // uid de quem criou (pode ser agente)
    updatedBy: zod_1.z.string().optional(),
});
/**
 * Helper para construir um novo ticket a partir de dados crus.
 * Útil no supportService.ts na hora de criar tickets.
 */
function buildNewTicket(input) {
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
