import { Response } from "express";
import { buildUserContext } from "./context";
import { aiClient } from "../utils/aiClient";
import { logger } from "../utils/logger";
import { db } from "src/services/firebase";
import { FirestoreAdapter } from "../core/adapters/firestore";
import { calculateFinancialHealthMath } from "../cfo/logic/calculator";
import { chargeCredits } from "../billing/chargeCredits";
import type { PlanTier } from "../billing/creditsTypes";

export type AdvisorAction = {
  name: string;
  args?: Record<string, any>;
  confirmText?: string;
};

export type AdvisorReply = {
  answer: string;
  actions?: AdvisorAction[];
  voice?: boolean;
};

export async function advisorReply(message: string): Promise<AdvisorReply> {
  return { answer: "Estou indisponível no momento.", voice: false };
}

export async function runAdvisor(req: any, res: Response) {
  const userId = req.user?.uid;
  const tenantId = req.tenant?.info?.id || "default";
  const plan = (req.tenant?.info?.plan || "starter") as PlanTier;
  const message = String(req.body.message || "").trim();

  if (!userId) return res.status(401).json({ ok: false, error: "Usuário não autenticado." });
  if (!message) return res.status(400).json({ ok: false, error: "Mensagem vazia." });

  try {
    // 2. BUSCA DE CONTEXTO FINANCEIRO (PULSE)
    let financialContext = "";
    try {
      const adapter = new FirestoreAdapter(tenantId);
      const { currentBalance } = await adapter.getDashboardData();
      const { items: transactions } = await adapter.getRecords({ limit: 100 });

      const health = calculateFinancialHealthMath(currentBalance, transactions);

      financialContext = `
DADOS FINANCEIROS ATUAIS DA EMPRESA:
- Saldo em Caixa: R$ ${currentBalance.toFixed(2)}
- Runway (Vida útil do caixa): ${health.runwayMonths.toFixed(1)} meses
- Média de Receita Mensal: R$ ${(health.netCashFlow + health.avgBurnRate).toFixed(2)}
- Média de Despesa Mensal (Burn): R$ ${health.avgBurnRate.toFixed(2)}
- Status de Saúde: ${health.status}
`;
    } catch (err) {
      logger.warn("Failed to load financial context for advisor", { tenantId });
    }

    // 3. Construção do Prompt
    const { systemPrompt: baseSystemPrompt } = await buildUserContext(userId);

    const enrichedSystemPrompt = `
${baseSystemPrompt}

${financialContext}

INSTRUÇÃO IMPORTANTE:
Você é um CFO experiente analisando os dados acima.
Responda à pergunta do usuário considerando estritamente esses números.
Se o runway for baixo (menos de 6 meses), alerte o usuário em sua resposta.
Seja conciso, prático e numérico quando possível.
`;

    // 4. Execução IA (Com cobrança de créditos transacional e idempotente)
    const result = await chargeCredits(
      {
        tenantId,
        plan,
        featureKey: "advisor.query",
        traceId: req.traceId,
        idempotencyKey: req.header("x-idempotency-key"),
      },
      async () => {
        return await aiClient(enrichedSystemPrompt, {
          tenantId,
          userId,
          model: "gemini",
          promptKind: "advisor",
          locale: req.tenant?.info?.locale || "pt-BR",
        });
      }
    );

    const answerText = result.text?.trim() || "Não consegui gerar uma resposta agora.";

    // 5. Analisa Ações
    const actions: AdvisorAction[] = [];
    if (/alerta/i.test(answerText) || /alert/i.test(answerText)) {
      actions.push({
        name: "create-alert",
        args: { message: "Alerta sugerido pela IA" },
        confirmText: "Deseja criar este alerta?",
      });
    }

    const reply: AdvisorReply = {
      answer: answerText,
      actions,
      voice: true,
    };

    // 6. Histórico
    await db.collection("ai_conversations").add({
      uid: userId,
      message,
      response: answerText,
      contextUsed: !!financialContext,
      timestamp: Date.now(),
      tenantId,
    });

    return res.json({ ok: true, reply });

  } catch (error: any) {
    logger.error("Advisor execution failed", { userId, error: error.message });

    // Se for erro de créditos, propaga o status 402
    if (error.status === 402 || error.code === "NO_CREDITS") {
      return res.status(402).json({
        ok: false,
        code: "NO_CREDITS",
        message: "Você não possui créditos de IA suficientes."
      });
    }

    const fallback = await advisorReply(message);
    return res.json({ ok: true, reply: fallback });
  }
}

export const processChatMessage = advisorReply;
