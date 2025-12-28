import { db } from "src/services/firebase";
// utils/metrics.ts

import { logger } from "./logger";

/**
 * Registra uma métrica operacional ou de uso.
 * @param metric Nome da métrica (ex: 'api_latency', 'ai_usage')
 * @param data   Dados adicionais (ex: rota, tempo, tenant, status)
 */
export async function recordMetric(metric: string, data: Record<string, any>) {
  try {
    const entry = {
      metric,
      ...data,
      timestamp: new Date().toISOString(),
    };
    await db.collection("system_metrics").add(entry);
  } catch (err) {
    logger.error("Failed to write metric", { metric, err });
  }
}

/**
 * Calcula média simples de latência de uma rota.
 */
export async function recordLatency(route: string, latencyMs: number, tenantId?: string) {
  return recordMetric("api_latency", { route, latencyMs, tenantId });
}



