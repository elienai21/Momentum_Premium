// ============================
// 💬 Support Module — Momentum AI Support (v9.0.2)
// ============================

import { Router, Request, Response, NextFunction } from "express";
import "../types";
import { z } from "zod";
import { db } from "src/services/firebase";

import { requireAuth } from "../middleware/requireAuth";
import { withTenant } from "../middleware/withTenant";
import { ApiError } from "../utils/errors";
import { logger } from "../utils/logger";
import { chargeCredits } from "../billing/chargeCredits";
import { CREDIT_COSTS } from "../config/credits";
import type { PlanTier } from "../billing/creditsTypes";

import {
  getSupportAnswer,
  SupportRequestContext,
} from "../support/supportService";

import { logActionFromRequest } from "./audit/auditService";

export const supportRouter = Router();

// Todas as rotas de suporte exigem auth + tenant
supportRouter.use(requireAuth, withTenant);

// ============================
// 🧩 Helpers
// ============================

function ensureTenantAndUser(req: Request) {
  if (!req.tenant || !req.tenant.info?.id) {
    throw new ApiError(400, "Tenant context is required.");
  }
  if (!req.user || !req.user.uid) {
    throw new ApiError(401, "Authentication is required.");
  }
}

function getTenantId(req: Request): string {
  return req.tenant!.info.id;
}

function getUserId(req: Request): string {
  return req.user!.uid;
}

function getUserEmail(req: Request): string {
  return req.user?.email ?? "anon";
}

// ============================
// 🧾 Schemas
// ============================

const chatSchema = z.object({
  question: z.string().min(3),
  locale: z.string().optional(), // ex: "pt-BR"
  sessionId: z.string().optional(),
});

const feedbackSchema = z.object({
  sessionId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

// ============================
// 💬 POST /support/chat
// Cria (ou continua) uma sessão de suporte e gera resposta da IA
// ============================

supportRouter.post(
  "/chat",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      ensureTenantAndUser(req);

      const tenantId = getTenantId(req);
      const userId = getUserId(req);
      const email = getUserEmail(req);

      const { question, locale, sessionId } = chatSchema.parse(req.body || {});

      const plan = (req.tenant?.info?.plan || "starter") as PlanTier;
      const featureKey = "support.ask" as const;

      // 1) Criar ou recuperar sessão de suporte
      let effectiveSessionId = sessionId;
      let sessionRef: FirebaseFirestore.DocumentReference;

      if (!effectiveSessionId) {
        // Nova sessão
        sessionRef = db.collection("support_sessions").doc();
        effectiveSessionId = sessionRef.id;

        const now = new Date().toISOString();
        const sessionDoc = {
          tenantId,
          userId,
          email,
          status: "open",
          channel: "in_app",
          subject:
            question.length > 80 ? question.slice(0, 77) + "..." : question,
          messageCount: 0,
          aiMessageCount: 0,
          agentMessageCount: 0,
          createdAt: now,
          updatedAt: now,
          lastActivityAt: now,
        };

        await sessionRef.set(sessionDoc);

        await logActionFromRequest(req, "support.session.create", {
          sessionId: effectiveSessionId,
        });
      } else {
        sessionRef = db.collection("support_sessions").doc(effectiveSessionId);
        const snap = await sessionRef.get();
        if (!snap.exists) {
          throw new ApiError(404, "Support session not found.");
        }
        const data = snap.data() as any;
        if (data.tenantId !== tenantId || data.userId !== userId) {
          throw new ApiError(403, "You cannot access this support session.");
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
      const ctx: SupportRequestContext = {
        tenantId,
        userId,
        locale: locale || "pt-BR",
        plan,
        traceId: (req as any)?.traceId,
      };

      const aiResponse = await chargeCredits(
        {
          tenantId,
          plan,
          featureKey,
          traceId: ctx.traceId,
          idempotencyKey: req.header("x-idempotency-key"),
        },
        async () => {
          return await getSupportAnswer(
            {
              tenantId,
              userId,
              question,
              locale,
              planTier: plan,
            },
            ctx,
          );
        }
      );

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
        messageCount: (FirebaseFirestore as any).FieldValue.increment(2),
        aiMessageCount: (FirebaseFirestore as any).FieldValue.increment(1),
        lastActivityAt: aiNow,
        updatedAt: aiNow,
      });

      // 6) Auditoria
      await logActionFromRequest(req, "support.chat", {
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
    } catch (err: any) {
      const status: number | undefined =
        err?.status || err?.response?.status || undefined;
      const payload = err?.payload || err?.response?.data || {};
      const apiCode: string | undefined = payload?.code || err?.message;

      // 402 — sem créditos de IA para suporte
      if (status === 402 || apiCode === "NO_CREDITS") {
        res.status(402).json({
          ok: false,
          code: "NO_CREDITS",
          message:
            payload?.message ||
            "Você não possui créditos de IA suficientes para usar o suporte automatizado.",
        });
        return;
      }

      // 503 — provedor de IA indisponível / erro de suporte
      if (
        status === 502 ||
        apiCode === "AI_PROVIDER_ERROR" ||
        err?.message === "NO_AI_AVAILABLE"
      ) {
        logger.warn("Support chat: AI provider unavailable", {
          error: err?.message,
        });
        res.status(503).json({
          ok: false,
          code: "AI_PROVIDER_ERROR",
          message:
            "No momento, o assistente de suporte inteligente não está disponível. Tente novamente em alguns instantes.",
        });
        return;
      }

      logger.error("Support chat failed", { error: err?.message });
      next(err);
    }
  },
);

// ============================
// 📋 GET /support/sessions
// Lista sessões de suporte do usuário atual
// ============================

supportRouter.get(
  "/sessions",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      ensureTenantAndUser(req);
      const tenantId = getTenantId(req);
      const userId = getUserId(req);

      const snap = await db
        .collection("support_sessions")
        .where("tenantId", "==", tenantId)
        .where("userId", "==", userId)
        .orderBy("createdAt", "desc")
        .limit(20)
        .get();

      const sessions = snap.docs.map((d: any) => ({
        id: d.id,
        ...(d.data() as Record<string, any>),
      }));

      await logActionFromRequest(req, "support.sessions.list", {
        count: sessions.length,
      });

      res.json({ ok: true, sessions });
    } catch (err: any) {
      logger.error("List support sessions failed", { error: err?.message });
      next(err);
    }
  },
);

// ============================
// 💬 GET /support/sessions/:sessionId/messages
// Lista mensagens de uma sessão de suporte
// ============================

supportRouter.get(
  "/sessions/:sessionId/messages",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      ensureTenantAndUser(req);
      const tenantId = getTenantId(req);
      const userId = getUserId(req);
      const { sessionId } = req.params;

      const sessionRef = db.collection("support_sessions").doc(sessionId);
      const sessionSnap = await sessionRef.get();

      if (!sessionSnap.exists) {
        throw new ApiError(404, "Support session not found.");
      }
      const session = sessionSnap.data() as any;
      if (session.tenantId !== tenantId || session.userId !== userId) {
        throw new ApiError(403, "You cannot access this support session.");
      }

      const messagesSnap = await sessionRef
        .collection("messages")
        .orderBy("createdAt", "asc")
        .limit(100)
        .get();

      const messages = messagesSnap.docs.map((d: any) => ({
        id: d.id,
        ...(d.data() as Record<string, any>),
      }));

      await logActionFromRequest(req, "support.messages.list", {
        sessionId,
        count: messages.length,
      });

      res.json({ ok: true, messages });
    } catch (err: any) {
      logger.error("List support messages failed", { error: err?.message });
      next(err);
    }
  },
);

// ============================
// ⭐ POST /support/feedback
// Registra feedback do usuário sobre uma sessão de suporte
// ============================

supportRouter.post(
  "/feedback",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      ensureTenantAndUser(req);

      const tenantId = getTenantId(req);
      const userId = getUserId(req);
      const email = getUserEmail(req);

      const { sessionId, rating, comment } = feedbackSchema.parse(
        req.body || {},
      );

      // Verifica se a sessão existe e pertence ao usuário
      const sessionRef = db.collection("support_sessions").doc(sessionId);
      const sessionSnap = await sessionRef.get();
      if (!sessionSnap.exists) {
        throw new ApiError(404, "Support session not found.");
      }
      const session = sessionSnap.data() as any;
      if (session.tenantId !== tenantId || session.userId !== userId) {
        throw new ApiError(403, "You cannot send feedback for this session.");
      }

      const now = new Date().toISOString();

      const feedbackRef = db.collection("support_feedback").doc();
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

      await logActionFromRequest(req, "support.feedback", {
        sessionId,
        rating,
      });

      res.json({ ok: true, feedbackId: feedbackRef.id });
    } catch (err: any) {
      logger.error("Support feedback failed", { error: err?.message });
      next(err);
    }
  },
);

// ✅ Exportação única (evita redeclaração)
export const router = supportRouter;
