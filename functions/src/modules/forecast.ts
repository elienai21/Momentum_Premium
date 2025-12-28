import { db } from "src/services/firebase";
// ============================
// 📈 Forecast Module — AI Cashflow (v7.9 Fix Final)
// ============================

import { Request, Response, NextFunction, Router } from "express";
import "../types";
import { aiClient } from "../utils/aiClient";
import { requireAuth } from "../middleware/requireAuth";
import { withTenant } from "../middleware/withTenant";
import { ApiError } from "../utils/errors";
import { logger } from "../utils/logger";
import { z } from "zod";

export const forecastRouter = Router();
forecastRouter.use(requireAuth, withTenant);

const forecastSchema = z.object({
  history: z.string().min(10, "History must be a stringified JSON."),
});

forecastRouter.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.tenant) throw new ApiError(400, "Tenant context required.");
    if (!req.user) throw new ApiError(401, "Authentication required.");

    const { history } = forecastSchema.parse(req.body);

    const prompt = `
Você é um analista financeiro especialista em pequenos negócios.
Analise o seguinte histórico de transações (em JSON) de um cliente no Brasil.
Projete o saldo futuro para os próximos 30, 60 e 90 dias.
Apresente o resultado em texto simples (markdown), com um resumo dos principais riscos e oportunidades.

Histórico de transações:
${history}
`;

    const result = await aiClient(prompt, {
      userId: req.user.uid,
      tenantId: req.tenant.info.id,
      model: "gemini",
      promptKind: "forecast",
      locale: req.tenant.info.locale ?? "pt-BR",
    });

    if (!result?.text) {
      logger.error("AI forecast returned no text", {
        tenantId: req.tenant.info.id,
        userId: req.user.uid,
      });
      throw new ApiError(500, "Forecast generation failed (empty response).");
    }

    res.json({
      status: "success",
      data: {
        forecast: result.text,
        tenantId: req.tenant.info.id,
        traceId: (req as any)?.traceId,
      },
    });
  } catch (err: any) {
    logger.error("Forecast endpoint failed", {
      error: err?.message ?? err,
      tenantId: req.tenant?.info?.id,
      userId: req.user?.uid,
    });
    next(err);
  }
});



