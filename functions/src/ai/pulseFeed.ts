import { db } from "src/services/firebase";
// functions/src/ai/pulseFeed.ts
import { runDualAI } from "./dualClient";

export async function generatePulseFeed(tenantId: string) {
  const prompt = `
  Gere um resumo conciso (JSON) de até 4 notícias econômicas relevantes
  (Brasil e mundo) para PMEs: titulo, impacto (baixa/média/alta), resumo (máx 2 frases).
  Responda APENAS um JSON válido.
  `;
  return runDualAI({ prompt, provider: "gemini", tenantId });
}



