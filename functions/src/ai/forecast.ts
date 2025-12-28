import { db } from "src/services/firebase";
// ============================
// 📊 AI Forecast Engine — Momentum (v7.9 Fix Final)
// ============================


import { DashboardData, Forecast, TenantInfo } from "../types";
import { logger } from "../utils/logger";
import { getPrompt } from "../config/prompts";
import { ApiError } from "../utils/errors";
import { aiClient } from "../utils/aiClient";
import { Request } from "express";

const CACHE_COLLECTION = "ai_forecast_cache";
const CACHE_TTL_HOURS = 24;

const isCacheFresh = (timestamp?: number): boolean => {
  return !!timestamp && Date.now() - timestamp < CACHE_TTL_HOURS * 3600 * 1000;
};

export async function getCashflowForecast(
  userId: string,
  dashboardData: DashboardData,
  _req: Request,
  tenantInfo?: TenantInfo
): Promise<Forecast> {
  if (!tenantInfo) {
    throw new ApiError(400, "Tenant information is required to generate a forecast.");
  }

  const tenantId = tenantInfo.id;
  const cacheRef = db.collection(CACHE_COLLECTION).doc(`${userId}_${tenantId}`);
  const cacheSnap = await cacheRef.get();

  if (cacheSnap.exists && isCacheFresh(cacheSnap.data()?.generatedAt)) {
    logger.info("Forecast served from cache", { userId, tenantId });
    return cacheSnap.data() as Forecast;
  }

  const promptTemplate = await getPrompt(tenantInfo.vertical, "forecast");
  const prompt = `
${promptTemplate}

Baseado nas transações financeiras recentes, projete o saldo estimado para os próximos 30, 60 e 90 dias.
Apresente também um breve resumo das principais observações.

Dados do usuário:
${JSON.stringify(dashboardData, null, 2)}

Responda no formato JSON:
{
  "forecast": { "30d": number, "60d": number, "90d": number },
  "insights": ["string insight 1", "string insight 2"]
}
`;

  try {
    const { text: rawText } = await aiClient(prompt, {
      userId,
      tenantId,
      model: "gemini",
      promptKind: "forecast",
      locale: tenantInfo.locale ?? "pt-BR",
    });

    if (!rawText) {
      logger.error("Forecast generation failed: no response", { tenantId, userId });
      throw new ApiError(500, "AI forecast returned no text.");
    }

    const parsed: Forecast = JSON.parse(rawText.replace(/```json|```/g, "").trim());

    const dataToCache = {
      ...parsed,
      generatedAt: Date.now(),
      userId,
      tenantId,
    };

    await cacheRef.set(dataToCache);
    logger.info("Forecast generated and cached", { tenantId, userId });

    return parsed;
  } catch (error: any) {
    logger.error("AI forecast error", { error: error.message, tenantId, userId });
    throw new ApiError(503, "AI forecast service unavailable.");
  }
}



