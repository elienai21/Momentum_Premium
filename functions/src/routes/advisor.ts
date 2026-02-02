import express from "express";
import { runAdvisor } from "../ai/advisor";
import { requireAuth } from "../middleware/requireAuth";
import { withTenant } from "../middleware/withTenant";

const router = express.Router();

// POST /api/advisor
router.post("/", requireAuth, withTenant, runAdvisor);

// POST /api/advisor/chat — versão sem restrição de plano
router.post("/chat", requireAuth, async (req, res) => {
  // Mantém compatibilidade: aceita { message } ou { text }
  const { message, text } = req.body || {};
  req.body.message = String(message || text || "").trim();
  return runAdvisor(req, res);
});

// POST /api/advisor/session — aceita histórico mas só envia última mensagem do usuário
router.post("/session", requireAuth, async (req, res) => {
  const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
  const lastUserMessage =
    [...messages].reverse().find((m) => m?.role === "user")?.content || "";

  req.body.message = String(lastUserMessage || req.body?.message || "").trim();
  return runAdvisor(req, res);
});

export default router;


