"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAdvisor = runAdvisor;
const context_1 = require("./context");
const aiClient_1 = require("../utils/aiClient");
const logger_1 = require("../utils/logger");
const firebase_1 = require("../services/firebase");
const firestore_1 = require("../core/adapters/firestore");
const calculator_1 = require("../cfo/logic/calculator");
const chargeCredits_1 = require("../billing/chargeCredits");
/**
 * Ponto de entrada principal para o Advisor (CFO AI).
 * Processa a mensagem do usuário, injeta contexto financeiro profundo e retorna a resposta.
 */
async function runAdvisor(req, res) {
    const userId = req.user?.uid;
    const tenantId = req.tenant?.info?.id || "default";
    const plan = (req.tenant?.info?.plan || "starter");
    const message = String(req.body.message || "").trim();
    if (!userId)
        return res.status(401).json({ ok: false, error: "Usuário não autenticado." });
    if (!message)
        return res.status(400).json({ ok: false, error: "Mensagem vazia." });
    try {
        // 1. BUSCA DE CONTEXTO FINANCEIRO (PULSE)
        // Em vez de pegar apenas os últimos 100, usamos o dashboard que analisa até 1000
        let financialContext = "";
        try {
            const adapter = new firestore_1.FirestoreAdapter(tenantId);
            const dashboard = await adapter.getDashboardData();
            // Busca registros para o cálculo de saúde (limitado a 500 para não estourar contexto agora, mas expansível)
            const { items: transactions } = await adapter.getRecords({ limit: 500 });
            const health = (0, calculator_1.calculateFinancialHealthMath)(dashboard.currentBalance, transactions);
            financialContext = `
DADOS FINANCEIROS REAIS DO TENANT (Momento: ${new Date().toISOString()}):
- Saldo Atual em Caixa: R$ ${dashboard.currentBalance.toFixed(2)}
- Receita Mensal Realizada: R$ ${dashboard.monthlyIncome.toFixed(2)}
- Despesa Mensal Realizada: R$ ${dashboard.monthlyExpense.toFixed(2)}
- Balanço do Mês: R$ ${(dashboard.monthlyIncome - dashboard.monthlyExpense).toFixed(2)}
- Runway Estimado: ${health.runwayMonths.toFixed(1)} meses
- Saúde Financeira: ${health.score}/100 [${health.status}]
- Top Categorias de Gasto: ${dashboard.categoryTotals.slice(0, 5).map(c => `${c.category}: R$ ${c.total.toFixed(2)}`).join(", ")}
`;
        }
        catch (err) {
            logger_1.logger.warn("Failed to load enriched financial context for advisor", { tenantId, traceId: req.traceId });
        }
        // 2. Construção do Prompt do Sistema
        const { systemPrompt: baseSystemPrompt } = await (0, context_1.buildUserContext)(userId);
        const enrichedSystemPrompt = `
${baseSystemPrompt}

${financialContext}

ESTRATÉGIA DE RESPOSTA:
1. Você é o Momentum CFO, um conselheiro financeiro de elite.
2. Seja direto, numérico e baseado em FATOS extraídos do contexto acima.
3. Se o usuário perguntar algo que não está nos dados, peça clareza ou informe a limitação.
4. Se identificar riscos (Runway < 6 meses), seja consultivo e sugira cortes ou novas receitas.
`;
        // 3. Execução da IA com controle de créditos
        const result = await (0, chargeCredits_1.chargeCredits)({
            tenantId,
            plan,
            featureKey: "advisor.query",
            traceId: req.traceId,
            idempotencyKey: req.header("x-idempotency-key"),
        }, async () => {
            return await (0, aiClient_1.aiClient)(`MENSAGEM DO USUÁRIO: ${message}\n\n${enrichedSystemPrompt}`, {
                tenantId,
                userId,
                model: "gemini",
                promptKind: "advisor",
                locale: req.tenant?.info?.locale || "pt-BR",
            });
        });
        const answerText = result.text?.trim() || "Não consegui analisar seus dados agora. Por favor, tente em alguns instantes.";
        // 4. Inteligência de Próximos Passos (Trigger de Ações)
        const actions = [];
        if (/reduzir gasto|economizar|cortar/i.test(answerText)) {
            actions.push({
                name: "analyze-expenses",
                confirmText: "Deseja que eu analise onde você pode economizar mais?"
            });
        }
        const reply = {
            answer: answerText,
            actions,
            voice: true,
        };
        // 5. Histórico e Auditoria
        await firebase_1.db.collection("ai_conversations").add({
            uid: userId,
            tenantId,
            message,
            response: answerText,
            contextUsed: !!financialContext,
            timestamp: Date.now(),
            traceId: req.traceId,
        });
        return res.json({ ok: true, reply });
    }
    catch (error) {
        logger_1.logger.error("Advisor execution failed", { userId, error: error.message, traceId: req.traceId });
        if (error.status === 402 || error.code === "NO_CREDITS") {
            return res.status(402).json({
                ok: false,
                code: "NO_CREDITS",
                message: "Seu plano atual atingiu o limite de uso da IA. Faça um upgrade para continuar perguntando."
            });
        }
        return res.status(500).json({
            ok: false,
            message: "O Consultor está indisponível momentaneamente. Nossos engenheiros já foram notificados. Tente novamente em alguns minutos."
        });
    }
}
