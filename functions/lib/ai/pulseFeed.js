"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePulseFeed = generatePulseFeed;
// functions/src/ai/pulseFeed.ts
const dualClient_1 = require("./dualClient");
async function generatePulseFeed(tenantId) {
    const prompt = `
  Gere um resumo conciso (JSON) de até 4 notícias econômicas relevantes
  (Brasil e mundo) para PMEs: titulo, impacto (baixa/média/alta), resumo (máx 2 frases).
  Responda APENAS um JSON válido.
  `;
    return (0, dualClient_1.runDualAI)({ prompt, provider: "gemini", tenantId });
}
