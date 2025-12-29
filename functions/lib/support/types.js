"use strict";
// functions/src/support/types.ts
// Tipos base compartilhados pelo módulo de suporte
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupportCategorySchema = exports.SupportSenderTypeSchema = exports.SupportChannelSchema = exports.SupportStatusSchema = exports.SupportPrioritySchema = void 0;
const zod_1 = require("zod");
// Prioridade do ticket / sessão
exports.SupportPrioritySchema = zod_1.z.enum([
    "low",
    "medium",
    "high",
    "urgent",
]);
// Status de ticket/sessão de suporte
exports.SupportStatusSchema = zod_1.z.enum([
    "open",
    "in_progress",
    "waiting_user",
    "escalated",
    "resolved",
    "closed",
    "cancelled",
]);
// Canal de origem da interação
exports.SupportChannelSchema = zod_1.z.enum([
    "in_app",
    "email",
    "whatsapp",
    "voice",
    "other",
]);
// Tipo de remetente da mensagem
exports.SupportSenderTypeSchema = zod_1.z.enum([
    "user",
    "agent",
    "ai",
    "system",
]);
// Tipo de ticket (categoria macro)
exports.SupportCategorySchema = zod_1.z.enum([
    "billing",
    "technical",
    "product",
    "training",
    "data",
    "other",
]);
