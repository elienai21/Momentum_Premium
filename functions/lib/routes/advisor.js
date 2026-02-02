"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const advisor_1 = require("../ai/advisor");
const requireAuth_1 = require("../middleware/requireAuth");
const withTenant_1 = require("../middleware/withTenant");
const router = express_1.default.Router();
// POST /api/advisor
router.post("/", requireAuth_1.requireAuth, withTenant_1.withTenant, advisor_1.runAdvisor);
// POST /api/advisor/chat — versão sem restrição de plano
router.post("/chat", requireAuth_1.requireAuth, async (req, res) => {
    // Mantém compatibilidade: aceita { message } ou { text }
    const { message, text } = req.body || {};
    req.body.message = String(message || text || "").trim();
    return (0, advisor_1.runAdvisor)(req, res);
});
// POST /api/advisor/session — aceita histórico mas só envia última mensagem do usuário
router.post("/session", requireAuth_1.requireAuth, async (req, res) => {
    const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
    const lastUserMessage = [...messages].reverse().find((m) => m?.role === "user")?.content || "";
    req.body.message = String(lastUserMessage || req.body?.message || "").trim();
    return (0, advisor_1.runAdvisor)(req, res);
});
exports.default = router;
