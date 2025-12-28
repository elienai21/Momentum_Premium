"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processChatMessage = void 0;
exports.advisorReply = advisorReply;
exports.runAdvisor = runAdvisor;
const context_1 = require("./context");
const aiClient_1 = require("../utils/aiClient");
const logger_1 = require("../utils/logger");
const checkPlan_1 = require("../middleware/checkPlan");
const firebase_1 = require("../services/firebase");
const firestore_1 = require("../core/adapters/firestore"); // Importe o adapter
const calculator_1 = require("../cfo/logic/calculator"); // Importe a calculadora
// Fallback local mantido...
async function advisorReply(message) {
    // ... (código existente de fallback)
    return { answer: "Estou indisponível no momento.", voice: false };
}
async function runAdvisor(req, res) {
    const userId = req.user?.uid;
    const tenantId = req.tenant?.info?.id || "default";
    const message = String(req.body.message || "").trim();
    if (!userId)
        return res.status(401).json({ ok: false, error: "Usuário não autenticado." });
    if (!message)
        return res.status(400).json({ ok: false, error: "Mensagem vazia." });
    try {
        // 1. Controle de Cota
        await (0, checkPlan_1.checkPlanLimit)(userId, 300, "textAI");
        // 2. BUSCA DE CONTEXTO FINANCEIRO (PULSE)
        // Aqui injetamos a inteligência real
        let financialContext = "";
        try {
            const adapter = new firestore_1.FirestoreAdapter(tenantId);
            const { currentBalance } = await adapter.getDashboardData();
            const { items: transactions } = await adapter.getRecords({ limit: 100 }); // Pequeno histórico para contexto
            // Usa a mesma lógica do CFO para ter os números mastigados
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
        // 4. Execução IA
        const result = await (0, aiClient_1.aiClient)(enrichedSystemPrompt, {
            tenantId,
            userId,
            model: "gemini",
            promptKind: "advisor",
            locale: req.tenant?.info?.locale || "pt-BR",
        });
        const answerText = result.text?.trim() || "Não consegui gerar uma resposta agora.";
        // 5. Analisa Ações (Exemplo simples)
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
        const fallback = await advisorReply(message); // Usa o fallback simples se der erro
        return res.json({ ok: true, reply: fallback });
    }
}
exports.processChatMessage = advisorReply;
