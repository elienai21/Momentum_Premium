import { db } from "src/services/firebase";


import { logger } from '../utils/logger';
import { RecordItem } from '../types';
import { runGemini } from '../utils/aiClient';

export async function getForecast(tenantId: string, transactions: RecordItem[]) {
    const historical = transactions.map(r => ({
        date: r.date,
        amount: r.amount,
        type: r.type,
    }));

    const prompt = `
        Analise os dados financeiros históricos abaixo de um usuário no Brasil e projete a receita, despesa e saldo
        para os próximos 30 dias. Forneça um resumo muito breve em uma frase.
        Seja realista, considerando tendências e sazonalidade. Responda em Português.

        Dados Históricos (últimos 90 dias):
        ${JSON.stringify(historical.slice(-90))}
    `;

    try {
        const result = await runGemini(prompt, {
            userId: "system-forecast",
            tenantId,
            model: "gemini",
            promptKind: "forecast",
            locale: "pt-BR",
        });
        
        const text = result.text || "";
        const summary = text.split('\n')[0] || "Previsão gerada.";

        // Optionally, save the forecast for historical analysis
        await db.collection(`tenants/${tenantId}/forecasts`).add({
            text,
            summary,
            createdAt: new Date().toISOString(),
        });

        return { summary, text };
    } catch (error) {
        logger.error("AI forecasting failed", { tenantId, error });
        return { summary: "Não foi possível gerar a previsão.", text: "" };
    }
}


