import { Request, Response } from "express";
import { buildUserContext } from "./context";
import { aiClient } from "../utils/aiClient";
import { logger } from "../utils/logger";
import { checkPlanLimit } from "../middleware/checkPlan";
import { db } from "src/services/firebase";
import { FirestoreAdapter } from "../core/adapters/firestore"; // Importe o adapter
import { calculateFinancialHealthMath } from "../cfo/logic/calculator"; // Importe a calculadora

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

// Fallback local mantido...
export async function advisorReply(message: string): Promise<AdvisorReply> {
  // ... (código existente de fallback)
  return { answer: "Estou indisponível no momento.", voice: false };
}

export async function runAdvisor(req: Request, res: Response) {
  const userId = req.user?.uid;
  const tenantId = req.tenant?.info?.id || "default";
  const message = String(req.body.message || "").trim();

  if (!userId) return res.status(401).json({ ok: false, error: "Usuário não autenticado." });
  if (!message) return res.status(400).json({ ok: false, error: "Mensagem vazia." });

  try {
    // 1. Controle de Cota
    await checkPlanLimit(userId, 300, "textAI");

    // 2. BUSCA DE CONTEXTO FINANCEIRO (PULSE)
    // Aqui injetamos a inteligência real
    let financialContext = "";
    try {
      const adapter = new FirestoreAdapter(tenantId);
      const { currentBalance } = await adapter.getDashboardData();
      const { items: transactions } = await adapter.getRecords({ limit: 100 }); // Pequeno histórico para contexto

      // Usa a mesma lógica do CFO para ter os números mastigados
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

    // 4. Execução IA
    const result = await aiClient(enrichedSystemPrompt, {
      tenantId,
      userId,
      model: "gemini",
      promptKind: "advisor",
      locale: req.tenant?.info?.locale || "pt-BR",
    });

    const answerText = result.text?.trim() || "Não consegui gerar uma resposta agora.";

    // 5. Analisa Ações (Exemplo simples)
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
    const fallback = await advisorReply(message); // Usa o fallback simples se der erro
    return res.json({ ok: true, reply: fallback });
  }
}

export const processChatMessage = advisorReply;
