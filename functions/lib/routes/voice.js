"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.voiceRouter = void 0;
// functions/src/routes/voice.ts
const express_1 = require("express");
const zod_1 = require("zod");
const ttsService_1 = require("../services/ttsService");
const sttService_1 = require("../services/sttService");
const aiClient_1 = require("../utils/aiClient");
const requireAuth_1 = require("../middleware/requireAuth");
const withTenant_1 = require("../middleware/withTenant");
const firestore_1 = require("../core/adapters/firestore");
const withSecrets_1 = require("../middleware/withSecrets");
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
const voiceRouter = (0, express_1.Router)();
exports.voiceRouter = voiceRouter;
// 🔒 Flag de ambiente: voz só em DEV (ou se VOICE_FEATURE_ENABLED=true)
const VOICE_ENABLED = process.env.NODE_ENV !== "production" ||
    process.env.VOICE_FEATURE_ENABLED === "true";
// Guard global do módulo de voz
voiceRouter.use((req, res, next) => {
    if (!VOICE_ENABLED) {
        return res.status(503).json({
            error: "Funcionalidade de voz desativada neste ambiente.",
            code: "VOICE_DISABLED",
        });
    }
    return next();
});
// Todas as rotas de voz exigem usuário autenticado + tenant resolvido
voiceRouter.use(requireAuth_1.requireAuth, withTenant_1.withTenant);
// -----------------------------
// POST /api/voice/tts
// Body: { text: string; lang?: string; voiceName?: string }
// -----------------------------
voiceRouter.post("/tts", async (req, res) => {
    const { text, lang = "pt-BR", voiceName } = req.body || {};
    if (!text || typeof text !== "string") {
        res.status(400).json({ error: "Campo 'text' é obrigatório." });
        return;
    }
    const tenantId = req.tenant?.info?.id || "anon";
    try {
        const result = await (0, ttsService_1.synthesizeToGcs)({
            tenantId,
            text,
            lang,
            voiceName,
        });
        // result esperado: { cached: boolean; url: string }
        res.status(200).json({
            audioUrl: result.url,
            cached: result.cached,
        });
    }
    catch (err) {
        const code = err?.code || "TTS_ERROR";
        const status = err?.status || (code === "VOICE_DISABLED" ? 503 : 500);
        // eslint-disable-next-line no-console
        console.error("Erro ao gerar TTS", err);
        res.status(status).json({
            error: code === "VOICE_DISABLED"
                ? "Funcionalidade de voz não está configurada neste ambiente."
                : "Erro ao gerar TTS.",
            code,
        });
    }
});
// -----------------------------
// POST /api/voice/stt
// Body: { gcsUri: string; languageCode?: string }
// -----------------------------
voiceRouter.post("/stt", async (req, res) => {
    const { gcsUri, languageCode = "pt-BR" } = req.body || {};
    if (!gcsUri || typeof gcsUri !== "string") {
        res.status(400).json({ error: "Campo 'gcsUri' é obrigatório." });
        return;
    }
    try {
        const result = await (0, sttService_1.transcribeFromGcs)({
            tenantId: req.tenant?.info?.id || "anon",
            gcsUri,
            languageCode,
        });
        // result esperado: { text: string }
        res.status(200).json({ transcript: result.text });
    }
    catch (err) {
        const code = err?.code || "STT_ERROR";
        const status = err?.status || (code === "VOICE_DISABLED" ? 503 : 500);
        // eslint-disable-next-line no-console
        console.error("Erro ao transcrever áudio", err);
        res.status(status).json({
            error: code === "VOICE_DISABLED"
                ? "Funcionalidade de voz não está configurada neste ambiente."
                : "Erro ao transcrever áudio.",
            code,
        });
    }
});
// -----------------------------
// POST /api/voice/session
// Body: { messages: { role: "user" | "assistant"; content: string }[] }
// -----------------------------
const voiceMessageSchema = zod_1.z.object({
    role: zod_1.z.union([zod_1.z.literal("user"), zod_1.z.literal("assistant")]),
    content: zod_1.z.string().min(1),
});
const voiceSessionBodySchema = zod_1.z.object({
    messages: zod_1.z.array(voiceMessageSchema).min(1),
});
voiceRouter.post("/session", async (req, res) => {
    try {
        const { messages } = voiceSessionBodySchema.parse(req.body || {});
        const tenantId = req.tenant?.info?.id || "anon";
        // Monta o histórico CFO <-> usuário
        const conversationLines = messages.map((m) => `${m.role === "user" ? "Usuário" : "CFO"}: ${m.content}`);
        const prompt = [
            "Você é o CFO virtual do Momentum, um SaaS financeiro B2B.",
            "Seu papel é explicar a situação financeira, fluxo de caixa e opções de decisão de forma clara, direta e em português do Brasil.",
            "Fale como um CFO experiente, mas com linguagem simples e prática.",
            "",
            "Histórico de conversa (mensagens mais antigas primeiro):",
            ...conversationLines,
            "",
            "Responda agora à última mensagem do usuário.",
            "Mantenha a resposta em até 3 parágrafos curtos, com foco em ações práticas.",
        ].join("\n");
        const llmResult = await (0, aiClient_1.runGemini)(prompt, { tenantId });
        res.status(200).json({
            reply: llmResult.text,
            actions: [],
        });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            res.status(400).json({
                error: "Payload inválido para sessão de voz.",
                details: err.errors,
            });
            return;
        }
        // eslint-disable-next-line no-console
        console.error("Erro em /api/voice/session", err);
        res.status(500).json({
            error: "Erro ao processar a sessão de voz do CFO.",
        });
    }
});
// -----------------------------
// ⚡ POST /api/voice/realtime-session
// Gera token efêmero para OpenAI Realtime (Live CFO)
// -----------------------------
voiceRouter.post("/realtime-session", async (req, res) => {
    try {
        if (!req.tenant || !req.user) {
            throw new errors_1.ApiError(400, "Tenant e usuário são obrigatórios para sessão de voz em tempo real.");
        }
        const tenantId = req.tenant.info?.id;
        const userId = req.user.uid;
        if (!tenantId) {
            throw new errors_1.ApiError(400, "Tenant inválido para sessão de voz.");
        }
        if (!withSecrets_1.OPENAI_KEY.value()) {
            logger_1.logger.error("[voice.realtime-session] OPENAI_KEY não configurada");
            throw new errors_1.ApiError(500, "Configuração de IA ausente.");
        }
        // ⏳ Hook futuro: checar plano/feature e créditos aqui (cfo.live)
        // 1) Buscar contexto financeiro atual (resumido)
        const adapter = new firestore_1.FirestoreAdapter(tenantId);
        const dashboard = await adapter.getDashboardData().catch((err) => {
            logger_1.logger.warn("[voice.realtime-session] Falha ao ler dashboardData", {
                tenantId,
                error: err?.message,
            });
            return {};
        });
        const saldo = dashboard.currentBalance ?? 0;
        const receita = dashboard.monthlyIncome ?? 0;
        const despesa = dashboard.monthlyExpense ?? 0;
        // 2) Montar instruções do CFO Live (curtas – boas pra mobile)
        const systemInstructions = `
Você é o Momentum Live CFO, um diretor financeiro de IA.
Fale sempre em Português do Brasil (pt-BR).
Seja direto, profissional, empático e didático.

CONTEXTO ATUAL DO NEGÓCIO (tenant: ${tenantId}):
- Saldo em Caixa: R$ ${saldo.toFixed(2)}
- Receita do mês: R$ ${receita.toFixed(2)}
- Despesas do mês: R$ ${despesa.toFixed(2)}

REGRAS:
1. Responda em no máximo 2 ou 3 frases por turno.
2. Se faltarem dados (por exemplo, não houver histórico suficiente), diga claramente o que está faltando e não invente números.
3. Evite jargões muito técnicos sem explicar.
4. Foque sempre em decisões práticas de caixa, lucro e sobrevivência do negócio.
`;
        // 3) Criar sessão efêmera na OpenAI Realtime
        const model = "gpt-4o-realtime-preview-2024-12-17";
        const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${withSecrets_1.OPENAI_KEY.value()}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model,
                voice: "verse",
                instructions: systemInstructions,
            }),
        });
        if (!response.ok) {
            const text = await response.text().catch(() => "");
            logger_1.logger.error("OpenAI Realtime API error", {
                status: response.status,
                body: text,
                tenantId,
                userId,
                traceId: req.traceId,
            });
            throw new errors_1.ApiError(502, "Erro ao criar sessão de voz com a IA.");
        }
        const sessionJson = await response.json();
        const clientSecret = sessionJson?.client_secret?.value;
        const expiresAt = sessionJson?.client_secret?.expires_at;
        if (!clientSecret) {
            logger_1.logger.error("[voice.realtime-session] Resposta sem client_secret", {
                tenantId,
                userId,
                sessionJson,
            });
            throw new errors_1.ApiError(502, "Resposta inválida do provedor de IA ao criar sessão de voz.");
        }
        logger_1.logger.info("[voice.realtime-session] Session criada", {
            tenantId,
            userId,
            model: sessionJson?.model || model,
            expiresAt,
            traceId: req.traceId,
        });
        // 🔄 Hook futuro: debitar créditos, registrar auditoria etc.
        res.status(200).json({
            status: "ok",
            provider: "openai",
            wsUrl: "wss://api.openai.com/v1/realtime",
            model: sessionJson?.model || model,
            clientSecret,
            expiresAt,
            tenantId,
        });
    }
    catch (err) {
        logger_1.logger.error("Voice realtime-session error", {
            error: err?.message,
            stack: err?.stack,
            traceId: req.traceId,
        });
        const status = err instanceof errors_1.ApiError ? err.status : 500;
        res.status(status).json({
            error: err?.message || "Erro interno ao iniciar sessão de voz.",
        });
    }
});
