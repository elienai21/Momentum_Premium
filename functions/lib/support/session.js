"use strict";
// functions/src/support/session.ts
// Modelo de sessão de suporte (thread de atendimento)
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupportSessionSchema = void 0;
exports.buildNewSession = buildNewSession;
const zod_1 = require("zod");
const types_1 = require("./types");
exports.SupportSessionSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    tenantId: zod_1.z.string(),
    userId: zod_1.z.string(), // usuário atendido
    ticketId: zod_1.z.string().optional(), // se a sessão está vinculada a um ticket
    channel: types_1.SupportChannelSchema.default("in_app"),
    status: types_1.SupportStatusSchema.default("open"),
    // Resumo da sessão / assunto
    subject: zod_1.z.string().optional(),
    // Dados de IA / fluxo
    aiEnabled: zod_1.z.boolean().default(true),
    lastAiTurnAt: zod_1.z.string().optional(),
    // Métricas simples
    messageCount: zod_1.z.number().int().nonnegative().default(0),
    aiMessageCount: zod_1.z.number().int().nonnegative().default(0),
    agentMessageCount: zod_1.z.number().int().nonnegative().default(0),
    // Datas (ISO)
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string(),
    closedAt: zod_1.z.string().optional(),
    lastActivityAt: zod_1.z.string().optional(),
    // Auditoria
    createdBy: zod_1.z.string().optional(), // uid de quem abriu (pode ser system)
    updatedBy: zod_1.z.string().optional(),
});
/**
 * Helper para construir uma nova sessão de suporte.
 */
function buildNewSession(input) {
    const now = new Date().toISOString();
    return {
        tenantId: input.tenantId,
        userId: input.userId,
        ticketId: input.ticketId,
        channel: input.channel ?? "in_app",
        status: "open",
        subject: input.subject,
        aiEnabled: true,
        messageCount: 0,
        aiMessageCount: 0,
        agentMessageCount: 0,
        createdAt: now,
        updatedAt: now,
        createdBy: input.createdBy,
        updatedBy: input.createdBy,
    };
}
