"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMarketAdvice = getMarketAdvice;
// functions/src/market/marketAdvisorService.ts
const aiClient_1 = require("../utils/aiClient");
/**
 * Normaliza arrays vindos da IA: se vier string/undefined, vira [].
 */
function normalizeList(value) {
    if (Array.isArray(value)) {
        return value.map((v) => String(v)).filter(Boolean);
    }
    if (typeof value === "string" && value.trim().length > 0) {
        return [value.trim()];
    }
    return [];
}
async function getMarketAdvice(input, ctx) {
    const { tenantId, sector = "desconhecido", region = "Brasil", companySize = "desconhecido", question, planTier = "starter", } = input;
    const locale = ctx.locale || "pt-BR";
    const instructions = `
Você é um sistema de aconselhamento estratégico de mercado neutro e factual.

REGRAS MUITO IMPORTANTES:
- Use APENAS fatos históricos de mercado, padrões documentados e princípios amplamente validados.
- NÃO faça previsões numéricas de futuro (como "o faturamento vai crescer X%" ou datas específicas).
- NÃO dê opiniões pessoais. Fale de forma impessoal, baseada em evidências.
- NÃO cite nomes de especialistas individuais (analistas, gurus, influencers, etc.).
- NÃO tome partido político ou ideológico. Mantenha neutralidade.
- Você PODE usar princípios robustos de neurociência e psicologia comportamental em massa
  (ex.: aversão à perda, efeito manada, viés de confirmação, prova social),
  mas apenas quando forem conceitos amplamente aceitos na literatura.
- Evite linguagem de "palpite" (ex.: "eu acho", "talvez", "provavelmente").
- NÃO faça recomendações legais, fiscais, contábeis ou médicas.
- NÃO prometa retorno financeiro garantido. Sempre trate como cenários e riscos, não garantias.

CONTEXTUALIZAÇÃO:
- País principal: Brasil (salvo se a região indicar outra coisa).
- Setor do negócio do cliente (tenant): ${sector}.
- Porte da empresa: ${companySize}.
- Região: ${region}.
- Plano Momentum: ${planTier}.

Sua tarefa é gerar um aconselhamento estratégico de mercado para o cliente, com base
exclusivamente em padrões históricos, dados agregados e princípios comportamentais.
`;
    const userPrompt = `
Pergunta do usuário (se houver):
"${question || "Sem pergunta específica; forneça um panorama geral baseado no setor."}"

Por favor, responda APENAS com um JSON válido no seguinte formato:

{
  "summary": "string - resumo geral em 2-4 frases, linguagem clara, em português do Brasil",
  "marketFacts": [
    "fato de mercado 1 (histórico, bem estabelecido)",
    "fato de mercado 2"
  ],
  "historicalPatterns": [
    "padrão histórico relevante 1",
    "padrão histórico relevante 2"
  ],
  "risks": [
    "risco apoiado em evidência 1",
    "risco apoiado em evidência 2"
  ],
  "opportunities": [
    "oportunidade apoiada em evidência 1",
    "oportunidade apoiada em evidência 2"
  ],
  "consumerBehaviorInsights": [
    "insight sobre comportamento de massa 1 (opcional)",
    "insight sobre comportamento de massa 2 (opcional)"
  ],
  "recommendedActions": [
    "ação recomendada 1, clara e prática, baseada em padrões históricos",
    "ação recomendada 2"
  ]
}

Lembre-se:
- Não use linguagem de promessa garantida ("garantido", "certeza absoluta").
- Mantenha o texto completamente neutro e baseado em evidência.
`;
    const fullPrompt = `${instructions.trim()}

=== CONTEXTO DO CLIENTE ===
${JSON.stringify({
        tenantId,
        sector,
        region,
        companySize,
        planTier,
    }, null, 2)}

=== TAREFA ===
${userPrompt.trim()}
`;
    // Chamada ao cliente de IA unificado
    const result = await (0, aiClient_1.aiClient)(fullPrompt, {
        tenantId,
        userId: ctx.userId,
        model: "gemini", // pode trocar por outro se tiver lógica de plano
        promptKind: "market.advice",
        locale,
    });
    const rawText = result?.text || "";
    let parsed;
    try {
        parsed = JSON.parse(rawText);
    }
    catch {
        // Fallback simples caso o modelo não retorne JSON perfeito
        parsed = {};
    }
    const response = {
        summary: typeof parsed.summary === "string" && parsed.summary.trim().length > 0
            ? parsed.summary.trim()
            : "Não foi possível gerar um resumo de mercado estruturado neste momento. Tente novamente em alguns instantes.",
        marketFacts: normalizeList(parsed.marketFacts),
        historicalPatterns: normalizeList(parsed.historicalPatterns),
        risks: normalizeList(parsed.risks),
        opportunities: normalizeList(parsed.opportunities),
        consumerBehaviorInsights: normalizeList(parsed.consumerBehaviorInsights),
        recommendedActions: normalizeList(parsed.recommendedActions),
    };
    return response;
}
