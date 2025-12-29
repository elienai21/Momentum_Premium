"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvePlanTier = resolvePlanTier;
exports.resolveTextModelForPlan = resolveTextModelForPlan;
exports.generateCfoAiReport = generateCfoAiReport;
// functions/src/cfo/aiReport.ts
const aiClient_1 = require("../utils/aiClient");
const logger_1 = require("../utils/logger");
const advisorContext_1 = require("./advisorContext");
/**
 * Normaliza um planId qualquer para um PlanTier conhecido.
 * Qualquer coisa não mapeada cai em "starter" como fallback seguro.
 */
function resolvePlanTier(planId) {
    const raw = (planId || "").toString().toLowerCase();
    if (raw === "pro")
        return "pro";
    if (raw === "cfo" || raw === "business" || raw === "enterprise")
        return "cfo";
    return "starter";
}
/**
 * Resolve o modelo de texto a ser usado de acordo com o plano.
 * Hook preparado para, no futuro, usar OpenAI em planos mais altos.
 */
function resolveTextModelForPlan(plan) {
    switch (plan) {
        case "cfo":
            // 🔁 Hook: aqui você pode trocar para "openai" em ambientes que suportarem.
            return "gemini";
        case "pro":
        case "starter":
        default:
            return "gemini";
    }
}
/**
 * Monta o prompt rico para o relatório de CFO.
 * Aqui reforçamos:
 * - não inventar números;
 * - apontar explicitamente lacunas de dados (ex.: mais de 5 dias sem registro).
 */
function buildCfoReportPrompt(args) {
    const { periodDays, locale, context } = args;
    const safeLocale = locale || "pt-BR";
    const baseIntro = safeLocale.startsWith("pt")
        ? `Você é um CFO virtual especializado em pequenas e médias empresas brasileiras.`
        : `You are a virtual CFO specialized in small and medium businesses.`;
    const instructionsPt = `
${baseIntro}

Você receberá a seguir um objeto JSON com:
- memória financeira do negócio (receitas, despesas, categorias principais, perfil de risco)
- plano de ações sugeridas
- health score financeiro (liquidez, previsibilidade, eficiência)
- período de análise em dias

Sua tarefa é gerar um RELATÓRIO NARRATIVO em linguagem natural, em português do Brasil, com as seguintes características:

1. Comece com um parágrafo de visão geral (ex.: "Nos últimos ${periodDays} dias, sua empresa apresentou...").
2. Em seguida, detalhe:
   - Receitas e despesas médias mensais
   - Situação de liquidez e sustentabilidade de caixa
   - Principais categorias de gastos que merecem atenção
   - Principais riscos identificados
3. Inclua uma seção "O que está indo bem" em texto corrido.
4. Inclua uma seção "Pontos de atenção" em texto corrido.
5. Inclua uma seção "Recomendações práticas nos próximos 30 dias" em texto corrido.
6. Seja direto, claro e sem bullet points. Use parágrafos curtos.
7. Não invente números que não estejam na base; se algo não estiver disponível, fale de forma qualitativa.

8. AO ANALISAR OS DADOS:
   - Se perceber que existem períodos contínuos sem registros de movimentação (por exemplo, vários dias seguidos sem dados ou com valores claramente ausentes), especialmente lacunas relevantes dentro dos ${periodDays} dias,
     você DEVE informar isso claramente em um parágrafo próprio.
   - Use uma formulação como:
     "Há lacunas relevantes de dados neste período; as conclusões abaixo consideram apenas os dias em que houve registros."
   - Se for possível identificar que a lacuna é grande (por exemplo, mais de 5 dias seguidos sem dados), mencione isso de forma qualitativa
     (ex.: "há um intervalo longo sem registros"), mas NÃO invente a quantidade exata de dias se não estiver explícita.

9. Se os dados forem claramente insuficientes para uma conclusão segura (por exemplo, poucos dias com movimento ou valores muito esparsos),
   deixe isso explícito na visão geral, deixando claro que o relatório é baseado em uma amostra limitada de informações.

Responda APENAS com o texto do relatório, sem usar markdown, títulos ou listas com hífen. Use no máximo 800 palavras.
`;
    const jsonBlock = JSON.stringify({
        periodDays,
        context,
    }, null, 2);
    return `${instructionsPt}

=== DADOS FINANCEIROS AGREGADOS (JSON) ===
${jsonBlock}
`;
}
/**
 * Função principal para gerar o relatório de CFO em linguagem natural.
 */
async function generateCfoAiReport(input) {
    const tenantId = input.tenantId;
    const userId = input.userId;
    const periodDays = input.periodDays && input.periodDays > 0 ? input.periodDays : 30;
    const locale = input.locale || "pt-BR";
    const planTier = resolvePlanTier(input.planId);
    try {
        // 1) Carrega contexto consolidado (memória + plano de ações + health score)
        const context = await (0, advisorContext_1.getAdvisorContext)(tenantId);
        // 2) Define modelo de texto de acordo com o plano
        const model = resolveTextModelForPlan(planTier);
        // 3) Monta prompt rico
        const prompt = buildCfoReportPrompt({
            periodDays,
            locale,
            context,
        });
        // 4) Chamada de IA unificada (Gemini/OpenAI) usando o cliente central
        const result = await (0, aiClient_1.aiClient)(prompt, {
            tenantId,
            userId,
            model,
            promptKind: "cfo_ai_report",
            locale,
        });
        const reportText = result?.text?.trim() ||
            "Não foi possível gerar o relatório financeiro neste momento. Tente novamente em alguns instantes.";
        const out = {
            report: reportText,
            meta: {
                model,
                provider: result?.provider || model,
                tokens: typeof result?.tokens === "number" ? result.tokens : undefined,
                generatedAt: new Date().toISOString(),
                periodDays,
                planTier,
            },
        };
        return out;
    }
    catch (error) {
        logger_1.logger.error("Erro ao gerar relatório CFO AI", {
            tenantId,
            userId,
            error: error?.message,
        });
        // Propaga o erro para que a rota HTTP possa decidir o status (502/500)
        throw error;
    }
}
