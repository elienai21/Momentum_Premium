import { db } from "src/services/firebase";
// ============================
// 🧠 Advisor Service — Financial Assistant (v7.9 Fix Final)
// ============================


import { AdvisorPromptDto, AdvisorReplyDto } from "../contracts/advisor";
import { aiClient } from "../utils/aiClient";
import { logger } from "../utils/logger";
import { ApiError } from "../utils/errors";

/**
 * Processa mensagens para o Advisor Financeiro.
 * Executa lógica de regras locais e fallback para IA (Gemini/OpenAI).
 */
export async function processAdvisorMessage(params: {
  tenantId: string;
  userId: string;
  message: string;
  traceId?: string;
  locale?: string;
}): Promise<AdvisorReplyDto> {
  const { tenantId, userId, message, traceId, locale } = params;

  logger.info("Advisor message received", { tenantId, userId, traceId });

  // 🔹 Regras locais rápidas (offline)
  if (/alerta|aviso/i.test(message)) {
    await db.collection("alerts").add({
      tenantId,
      userId,
      message: "Alerta automático criado pela IA",
      createdAt: new Date().toISOString(),
    });
    return {
      answer: "Criei um alerta baseado na sua solicitação.",
      actions: [{ name: "create-alert" }],
      voice: true,
    };
  }

  if (/invest/i.test(message)) {
    return {
      answer:
        "Sugiro avaliar fundos de renda fixa e CDBs para equilibrar risco e liquidez.",
      actions: [],
      voice: true,
    };
  }

  // 🔸 Prompt base do Advisor
  const systemPrompt = `
Você é o Advisor Financeiro Momentum.
Seu papel é fornecer conselhos práticos, éticos e objetivos sobre finanças pessoais.
Responda sempre em português (pt-BR) e com clareza em até 3 parágrafos.
Mensagem do usuário:
"${message}"
`;

  try {
    // 🔹 Chamando IA com client unificado
    const aiResponse = await aiClient(systemPrompt, {
      tenantId,
      userId,
      model: "gemini",
      promptKind: "advisor",
      locale: locale || "pt-BR",
    });

    const text = aiResponse?.text || "Não encontrei informações relevantes.";

    return { answer: text, voice: true };
  } catch (error: any) {
    logger.error("Advisor AI processing failed", { error: error.message });
    throw new ApiError(503, "Serviço de Advisor temporariamente indisponível.");
  }
}



