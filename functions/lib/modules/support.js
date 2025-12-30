"use strict";
// ============================
// 💬 Support Module — Momentum AI Support (v9.0.2)
// ============================
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = exports.supportRouter = void 0;
const express_1 = require("express");
require("../types");
const zod_1 = require("zod");
const firebase_1 = require("src/services/firebase");
const requireAuth_1 = require("../middleware/requireAuth");
const withTenant_1 = require("../middleware/withTenant");
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
const chargeCredits_1 = require("../billing/chargeCredits");
const supportService_1 = require("../support/supportService");
const auditService_1 = require("./audit/auditService");
exports.supportRouter = (0, express_1.Router)();
// Todas as rotas de suporte exigem auth + tenant
exports.supportRouter.use(requireAuth_1.requireAuth, withTenant_1.withTenant);
// ============================
// 🧩 Helpers
// ============================
function ensureTenantAndUser(req) {
    if (!req.tenant || !req.tenant.info?.id) {
        throw new errors_1.ApiError(400, "Tenant context is required.");
    }
    if (!req.user || !req.user.uid) {
        throw new errors_1.ApiError(401, "Authentication is required.");
    }
}
function getTenantId(req) {
    return req.tenant.info.id;
}
function getUserId(req) {
    return req.user.uid;
}
function getUserEmail(req) {
    return req.user?.email ?? "anon";
}
// ============================
// 🧾 Schemas
// ============================
const chatSchema = zod_1.z.object({
    question: zod_1.z.string().min(3),
    locale: zod_1.z.string().optional(), // ex: "pt-BR"
    sessionId: zod_1.z.string().optional(),
});
const feedbackSchema = zod_1.z.object({
    sessionId: zod_1.z.string().min(1),
    rating: zod_1.z.number().int().min(1).max(5),
    comment: zod_1.z.string().optional(),
});
// ============================
// 💬 POST /support/chat
// Cria (ou continua) uma sessão de suporte e gera resposta da IA
// ============================
exports.supportRouter.post("/chat", async (req, res, next) => {
    try {
        ensureTenantAndUser(req);
        const tenantId = getTenantId(req);
        const userId = getUserId(req);
        const email = getUserEmail(req);
        const { question, locale, sessionId } = chatSchema.parse(req.body || {});
        const plan = (req.tenant?.info?.plan || "starter");
        const featureKey = "support.ask";
        // 1) Criar ou recuperar sessão de suporte
        let effectiveSessionId = sessionId;
        let sessionRef;
        if (!effectiveSessionId) {
            // Nova sessão
            sessionRef = firebase_1.db.collection("support_sessions").doc();
            effectiveSessionId = sessionRef.id;
            const now = new Date().toISOString();
            const sessionDoc = {
                tenantId,
                userId,
                email,
                status: "open",
                channel: "in_app",
                subject: question.length > 80 ? question.slice(0, 77) + "..." : question,
                messageCount: 0,
                aiMessageCount: 0,
                agentMessageCount: 0,
                createdAt: now,
                updatedAt: now,
                lastActivityAt: now,
            };
            await sessionRef.set(sessionDoc);
            await (0, auditService_1.logActionFromRequest)(req, "support.session.create", {
                sessionId: effectiveSessionId,
            });
        }
        else {
            sessionRef = firebase_1.db.collection("support_sessions").doc(effectiveSessionId);
            const snap = await sessionRef.get();
            if (!snap.exists) {
                throw new errors_1.ApiError(404, "Support session not found.");
            }
            const data = snap.data();
            if (data.tenantId !== tenantId || data.userId !== userId) {
                throw new errors_1.ApiError(403, "You cannot access this support session.");
            }
            await sessionRef.update({
                updatedAt: new Date().toISOString(),
                lastActivityAt: new Date().toISOString(),
            });
        }
        // 2) Registrar mensagem do usuário
        const userMessageRef = sessionRef.collection("messages").doc();
        const now = new Date().toISOString();
        const userMessageDoc = {
            tenantId,
            sessionId: effectiveSessionId,
            senderType: "user",
            senderId: userId,
            senderName: email,
            channel: "in_app",
            content: question,
            attachments: [],
            internal: false,
            visibleToUser: true,
            createdAt: now,
        };
        await userMessageRef.set(userMessageDoc);
        // 3) Chamar IA de suporte (Com cobrança de créditos transacional e idempotente)
        const ctx = {
            tenantId,
            userId,
            locale: locale || "pt-BR",
            plan,
            traceId: req?.traceId,
        };
        const aiResponse = await (0, chargeCredits_1.chargeCredits)({
            tenantId,
            plan,
            featureKey,
            traceId: ctx.traceId,
            idempotencyKey: req.header("x-idempotency-key"),
        }, async () => {
            return await (0, supportService_1.getSupportAnswer)({
                tenantId,
                userId,
                question,
                locale,
                planTier: plan,
            }, ctx);
        });
        // 4) Registrar mensagem da IA
        const aiMessageRef = sessionRef.collection("messages").doc();
        const aiNow = new Date().toISOString();
        const aiMessageDoc = {
            tenantId,
            sessionId: effectiveSessionId,
            senderType: "ai",
            senderId: "ai",
            senderName: "Momentum AI",
            channel: "in_app",
            content: aiResponse.answer,
            attachments: [],
            internal: false,
            visibleToUser: true,
            createdAt: aiNow,
        };
        await aiMessageRef.set(aiMessageDoc);
        // 5) Atualizar contadores da sessão
        await sessionRef.update({
            // se seu projeto não tiver o namespace global FirebaseFirestore,
            // podemos trocar por admin.firestore.FieldValue depois
            messageCount: FirebaseFirestore.FieldValue.increment(2),
            aiMessageCount: FirebaseFirestore.FieldValue.increment(1),
            lastActivityAt: aiNow,
            updatedAt: aiNow,
        });
        // 6) Auditoria
        await (0, auditService_1.logActionFromRequest)(req, "support.chat", {
            sessionId: effectiveSessionId,
            question,
            answerLength: aiResponse.answer.length,
        });
        res.json({
            ok: true,
            sessionId: effectiveSessionId,
            answer: aiResponse.answer,
            language: aiResponse.language,
        });
    }
    catch (err) {
        const status = err?.status || err?.response?.status || undefined;
        const payload = err?.payload || err?.response?.data || {};
        const apiCode = payload?.code || err?.message;
        // 402 — sem créditos de IA para suporte
        if (status === 402 || apiCode === "NO_CREDITS") {
            res.status(402).json({
                ok: false,
                code: "NO_CREDITS",
                message: payload?.message ||
                    "Você não possui créditos de IA suficientes para usar o suporte automatizado.",
            });
            return;
        }
        // 503 — provedor de IA indisponível / erro de suporte
        if (status === 502 ||
            apiCode === "AI_PROVIDER_ERROR" ||
            err?.message === "NO_AI_AVAILABLE") {
            logger_1.logger.warn("Support chat: AI provider unavailable", {
                error: err?.message,
            });
            res.status(503).json({
                ok: false,
                code: "AI_PROVIDER_ERROR",
                message: "No momento, o assistente de suporte inteligente não está disponível. Tente novamente em alguns instantes.",
            });
            return;
        }
        logger_1.logger.error("Support chat failed", { error: err?.message });
        next(err);
    }
});
// ============================
// 📋 GET /support/sessions
// Lista sessões de suporte do usuário atual
// ============================
exports.supportRouter.get("/sessions", async (req, res, next) => {
    try {
        ensureTenantAndUser(req);
        const tenantId = getTenantId(req);
        const userId = getUserId(req);
        const snap = await firebase_1.db
            .collection("support_sessions")
            .where("tenantId", "==", tenantId)
            .where("userId", "==", userId)
            .orderBy("createdAt", "desc")
            .limit(20)
            .get();
        const sessions = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
        }));
        await (0, auditService_1.logActionFromRequest)(req, "support.sessions.list", {
            count: sessions.length,
        });
        res.json({ ok: true, sessions });
    }
    catch (err) {
        logger_1.logger.error("List support sessions failed", { error: err?.message });
        next(err);
    }
});
// ============================
// 💬 GET /support/sessions/:sessionId/messages
// Lista mensagens de uma sessão de suporte
// ============================
exports.supportRouter.get("/sessions/:sessionId/messages", async (req, res, next) => {
    try {
        ensureTenantAndUser(req);
        const tenantId = getTenantId(req);
        const userId = getUserId(req);
        const { sessionId } = req.params;
        const sessionRef = firebase_1.db.collection("support_sessions").doc(sessionId);
        const sessionSnap = await sessionRef.get();
        if (!sessionSnap.exists) {
            throw new errors_1.ApiError(404, "Support session not found.");
        }
        const session = sessionSnap.data();
        if (session.tenantId !== tenantId || session.userId !== userId) {
            throw new errors_1.ApiError(403, "You cannot access this support session.");
        }
        const messagesSnap = await sessionRef
            .collection("messages")
            .orderBy("createdAt", "asc")
            .limit(100)
            .get();
        const messages = messagesSnap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
        }));
        await (0, auditService_1.logActionFromRequest)(req, "support.messages.list", {
            sessionId,
            count: messages.length,
        });
        res.json({ ok: true, messages });
    }
    catch (err) {
        logger_1.logger.error("List support messages failed", { error: err?.message });
        next(err);
    }
});
// ============================
// ⭐ POST /support/feedback
// Registra feedback do usuário sobre uma sessão de suporte
// ============================
exports.supportRouter.post("/feedback", async (req, res, next) => {
    try {
        ensureTenantAndUser(req);
        const tenantId = getTenantId(req);
        const userId = getUserId(req);
        const email = getUserEmail(req);
        const { sessionId, rating, comment } = feedbackSchema.parse(req.body || {});
        // Verifica se a sessão existe e pertence ao usuário
        const sessionRef = firebase_1.db.collection("support_sessions").doc(sessionId);
        const sessionSnap = await sessionRef.get();
        if (!sessionSnap.exists) {
            throw new errors_1.ApiError(404, "Support session not found.");
        }
        const session = sessionSnap.data();
        if (session.tenantId !== tenantId || session.userId !== userId) {
            throw new errors_1.ApiError(403, "You cannot send feedback for this session.");
        }
        const now = new Date().toISOString();
        const feedbackRef = firebase_1.db.collection("support_feedback").doc();
        const feedbackDoc = {
            tenantId,
            userId,
            email,
            sessionId,
            rating,
            comment: comment ?? "",
            createdAt: now,
        };
        await feedbackRef.set(feedbackDoc);
        await (0, auditService_1.logActionFromRequest)(req, "support.feedback", {
            sessionId,
            rating,
        });
        res.json({ ok: true, feedbackId: feedbackRef.id });
    }
    catch (err) {
        logger_1.logger.error("Support feedback failed", { error: err?.message });
        next(err);
    }
});
// ✅ Exportação única (evita redeclaração)
exports.router = exports.supportRouter;
