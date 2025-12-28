"use strict";
// functions/src/support/message.ts
// Modelo de mensagem de suporte (chat)
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupportMessageSchema = void 0;
exports.buildNewMessage = buildNewMessage;
const zod_1 = require("zod");
const types_1 = require("./types");
exports.SupportMessageSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    tenantId: zod_1.z.string(),
    ticketId: zod_1.z.string(), // referenciado em SupportTicket
    sessionId: zod_1.z.string().optional(), // se houver sessão de chat
    senderType: types_1.SupportSenderTypeSchema, // "user" | "agent" | "ai" | "system"
    senderId: zod_1.z.string().optional(), // uid do usuário / agente
    senderName: zod_1.z.string().optional(),
    channel: types_1.SupportChannelSchema.default("in_app"),
    content: zod_1.z.string().min(1), // mensagem em texto
    // para anexos futuros: urls, tipo de arquivo, etc.
    attachments: zod_1.z
        .array(zod_1.z.object({
        url: zod_1.z.string(),
        type: zod_1.z.string().optional(),
        name: zod_1.z.string().optional(),
    }))
        .default([]),
    // flags
    internal: zod_1.z.boolean().default(false), // nota interna visível só para agente
    visibleToUser: zod_1.z.boolean().default(true),
    createdAt: zod_1.z.string(), // ISO
});
/**
 * Helper para construir uma nova mensagem, garantindo defaults.
 */
function buildNewMessage(input) {
    const now = new Date().toISOString();
    return {
        tenantId: input.tenantId,
        ticketId: input.ticketId,
        sessionId: input.sessionId,
        senderType: input.senderType,
        senderId: input.senderId,
        senderName: input.senderName,
        channel: input.channel ?? "in_app",
        content: input.content,
        attachments: input.attachments ?? [],
        internal: input.internal ?? false,
        visibleToUser: input.visibleToUser ?? !input.internal, // se for interna, por padrão não é visível
        createdAt: now,
    };
}
