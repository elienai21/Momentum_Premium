// functions/src/routes/voice.ts
import { Request, Response, Router } from "express";
import { z } from "zod";
import { synthesizeToGcs } from "../services/ttsService";
import { transcribeFromGcs } from "../services/sttService";
import { runGemini } from "../utils/aiClient";
import { requireAuth } from "../middleware/requireAuth";
import { withTenant } from "../middleware/withTenant";
import { FirestoreAdapter } from "../core/adapters/firestore";
import { OPENAI_KEY } from "../middleware/withSecrets";
import { ApiError } from "../utils/errors";
import { logger } from "../utils/logger";

const voiceRouter = Router();

// 🔒 Flag de ambiente: voz só em DEV (ou se VOICE_FEATURE_ENABLED=true)
const VOICE_ENABLED =
  process.env.NODE_ENV !== "production" ||
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

// Tipagem básica local (o restante do projeto pode ter um AuthedRequest global)
type AuthedRequest = Request & {
  tenant?: { info?: { id: string; plan?: string; locale?: string } };
  user?: { uid: string; email?: string | null };
  traceId?: string;
};

// Todas as rotas de voz exigem usuário autenticado + tenant resolvido
voiceRouter.use(requireAuth, withTenant);

// -----------------------------
// POST /api/voice/tts
// Body: { text: string; lang?: string; voiceName?: string }
// -----------------------------
voiceRouter.post(
  "/tts",
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const { text, lang = "pt-BR", voiceName } = req.body || {};

    if (!text || typeof text !== "string") {
      res.status(400).json({ error: "Campo 'text' é obrigatório." });
      return;
    }

    const tenantId = req.tenant?.info?.id || "anon";

    try {
      const result = await synthesizeToGcs({
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
    } catch (err: any) {
      const code = err?.code || "TTS_ERROR";
      const status = err?.status || (code === "VOICE_DISABLED" ? 503 : 500);

      // eslint-disable-next-line no-console
      console.error("Erro ao gerar TTS", err);

      res.status(status).json({
        error:
          code === "VOICE_DISABLED"
            ? "Funcionalidade de voz não está configurada neste ambiente."
            : "Erro ao gerar TTS.",
        code,
      });
    }
  }
);

// -----------------------------
// POST /api/voice/stt
// Body: { gcsUri: string; languageCode?: string }
// -----------------------------
voiceRouter.post(
  "/stt",
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const { gcsUri, languageCode = "pt-BR" } = req.body || {};

    if (!gcsUri || typeof gcsUri !== "string") {
      res.status(400).json({ error: "Campo 'gcsUri' é obrigatório." });
      return;
    }

    try {
      const result = await transcribeFromGcs({
        tenantId: req.tenant?.info?.id || "anon",
        gcsUri,
        languageCode,
      });

      // result esperado: { text: string }
      res.status(200).json({ transcript: result.text });
    } catch (err: any) {
      const code = err?.code || "STT_ERROR";
      const status = err?.status || (code === "VOICE_DISABLED" ? 503 : 500);

      // eslint-disable-next-line no-console
      console.error("Erro ao transcrever áudio", err);

      res.status(status).json({
        error:
          code === "VOICE_DISABLED"
            ? "Funcionalidade de voz não está configurada neste ambiente."
            : "Erro ao transcrever áudio.",
        code,
      });
    }
  }
);

// -----------------------------
// POST /api/voice/session
// Body: { messages: { role: "user" | "assistant"; content: string }[] }
// -----------------------------

const voiceMessageSchema = z.object({
  role: z.union([z.literal("user"), z.literal("assistant")]),
  content: z.string().min(1),
});

const voiceSessionBodySchema = z.object({
  messages: z.array(voiceMessageSchema).min(1),
});

voiceRouter.post(
  "/session",
  async (req: AuthedRequest, res: Response): Promise<void> => {
    try {
      const { messages } = voiceSessionBodySchema.parse(req.body || {});
      const tenantId = req.tenant?.info?.id || "anon";

      // Monta o histórico CFO <-> usuário
      const conversationLines = messages.map((m) =>
        `${m.role === "user" ? "Usuário" : "CFO"}: ${m.content}`
      );

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

      const llmResult = await runGemini(prompt, { tenantId } as any);

      res.status(200).json({
        reply: llmResult.text,
        actions: [],
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
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
  }
);

// -----------------------------
// ⚡ POST /api/voice/realtime-session
// Gera token efêmero para OpenAI Realtime (Live CFO)
// -----------------------------
voiceRouter.post(
  "/realtime-session",
  async (req: AuthedRequest, res: Response): Promise<void> => {
    try {
      if (!req.tenant || !req.user) {
        throw new ApiError(
          400,
          "Tenant e usuário são obrigatórios para sessão de voz em tempo real."
        );
      }

      const tenantId = req.tenant.info?.id;
      const userId = req.user.uid;

      if (!tenantId) {
        throw new ApiError(400, "Tenant inválido para sessão de voz.");
      }

      if (!OPENAI_KEY.value()) {
        logger.error("[voice.realtime-session] OPENAI_KEY não configurada");
        throw new ApiError(500, "Configuração de IA ausente.");
      }

      // ⏳ Hook futuro: checar plano/feature e créditos aqui (cfo.live)

      // 1) Buscar contexto financeiro atual (resumido)
      const adapter = new FirestoreAdapter(tenantId);
      const dashboard = await adapter.getDashboardData().catch((err: any) => {
        logger.warn("[voice.realtime-session] Falha ao ler dashboardData", {
          tenantId,
          error: err?.message,
        });
        return {} as any;
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

      const response = await fetch(
        "https://api.openai.com/v1/realtime/sessions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENAI_KEY.value()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            voice: "verse",
            instructions: systemInstructions,
          }),
        }
      );

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        logger.error("OpenAI Realtime API error", {
          status: response.status,
          body: text,
          tenantId,
          userId,
          traceId: req.traceId,
        });
        throw new ApiError(502, "Erro ao criar sessão de voz com a IA.");
      }

      const sessionJson: any = await response.json();

      const clientSecret = sessionJson?.client_secret?.value;
      const expiresAt = sessionJson?.client_secret?.expires_at;

      if (!clientSecret) {
        logger.error("[voice.realtime-session] Resposta sem client_secret", {
          tenantId,
          userId,
          sessionJson,
        });
        throw new ApiError(
          502,
          "Resposta inválida do provedor de IA ao criar sessão de voz."
        );
      }

      logger.info("[voice.realtime-session] Session criada", {
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
    } catch (err: any) {
      logger.error("Voice realtime-session error", {
        error: err?.message,
        stack: err?.stack,
        traceId: (req as any).traceId,
      });

      const status = err instanceof ApiError ? err.status : 500;
      res.status(status).json({
        error: err?.message || "Erro interno ao iniciar sessão de voz.",
      });
    }
  }
);

export { voiceRouter };
