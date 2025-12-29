"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processChatMessage = void 0;
exports.advisorReply = advisorReply;
exports.runAdvisor = runAdvisor;
const context_1 = require("./context");
const aiClient_1 = require("../utils/aiClient");
const logger_1 = require("../utils/logger");
const firebase_1 = require("../services/firebase");
const firestore_1 = require("../core/adapters/firestore");
const calculator_1 = require("../cfo/logic/calculator");
const chargeCredits_1 = require("../billing/chargeCredits");
async function advisorReply(message) {
    return { answer: "Estou indisponível no momento.", voice: false };
}
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
        // 2. BUSCA DE CONTEXTO FINANCEIRO (PULSE)
        let financialContext = "";
        try {
            const adapter = new firestore_1.FirestoreAdapter(tenantId);
            const { currentBalance } = await adapter.getDashboardData();
            const { items: transactions } = await adapter.getRecords({ limit: 100 });
            const health = (0, calculator_1.calculateFinancialHealthMath)(currentBalance, transactions);
            financialContext = `
DADOS FINANCEIROS ATUAIS DA EMPRESA:
- Saldo em Caixa: R$ ${currentBalance.toFixed(2)}
- Runway (Vida útil do caixa): ${health.runwayMonths.toFixed(1)} meses
- Média de Receita Mensal: R$ ${(health.netCashFlow + health.avgBurnRate).toFixed(2)}
- Média de Despesa Mensal (Burn): R$ ${health.avgBurnRate.toFixed(2)}
- Status de Saúde: ${health.status}
`;
        }
        catch (err) {
            logger_1.logger.warn("Failed to load financial context for advisor", { tenantId });
        }
        // 3. Construção do Prompt
        const { systemPrompt: baseSystemPrompt } = await (0, context_1.buildUserContext)(userId);
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
        const result = await (0, chargeCredits_1.chargeCredits)({
            tenantId,
            plan,
            featureKey: "advisor.query",
            traceId: req.traceId,
            idempotencyKey: req.header("x-idempotency-key"),
        }, async () => {
            return await (0, aiClient_1.aiClient)(enrichedSystemPrompt, {
                tenantId,
                userId,
                model: "gemini",
                promptKind: "advisor",
                locale: req.tenant?.info?.locale || "pt-BR",
            });
        });
        const answerText = result.text?.trim() || "Não consegui gerar uma resposta agora.";
        // 5. Analisa Ações
        const actions = [];
        if (/alerta/i.test(answerText) || /alert/i.test(answerText)) {
            actions.push({
                name: "create-alert",
                args: { message: "Alerta sugerido pela IA" },
                confirmText: "Deseja criar este alerta?",
            });
        }
        const reply = {
            answer: answerText,
            actions,
            voice: true,
        };
        // 6. Histórico
        await firebase_1.db.collection("ai_conversations").add({
            uid: userId,
            message,
            response: answerText,
            contextUsed: !!financialContext,
            timestamp: Date.now(),
            tenantId,
        });
        return res.json({ ok: true, reply });
    }
    catch (error) {
        logger_1.logger.error("Advisor execution failed", { userId, error: error.message });
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
exports.processChatMessage = advisorReply;
