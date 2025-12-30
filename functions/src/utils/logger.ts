// ============================
// Momentum Logger — Cloud & Local (v7.9 Final)
// ============================

import { Request } from "express";

type Meta = Record<string, any>;

function normalizeMeta(
  metaOrTrace: string | Meta,
  extraMeta: Meta,
  req?: Request
) {
  const meta =
    typeof metaOrTrace === "string"
      ? { traceId: metaOrTrace, ...extraMeta }
      : { ...metaOrTrace, ...extraMeta };

  const traceId = meta.traceId ?? req?.traceId;
  const cleanedMeta = { ...meta };
  delete (cleanedMeta as any).traceId;

  const base = {
    path: req?.path,
    user: req?.user?.uid,
    tenant: req?.tenant?.info?.id,
    ...cleanedMeta,
  } as Record<string, any>;

  if (traceId !== undefined) {
    base.traceId = traceId;
  }

  return base;
}

export const logger = {
  info: (
    message: string,
    metaOrTrace: string | Meta = {},
    reqOrMeta?: Request | Meta,
    maybeReq?: Request
  ) => {
    const req = reqOrMeta && "method" in (reqOrMeta as any) ? (reqOrMeta as Request) : maybeReq;
    const meta = reqOrMeta && !req ? (reqOrMeta as Meta) : {};

    const base = normalizeMeta(metaOrTrace, meta, req);
    console.log(JSON.stringify({ level: "info", message, ...base }));
  },

  warn: (message: string, meta: Meta = {}, req?: Request) => {
    const base = normalizeMeta(meta, {}, req);
    console.warn(JSON.stringify({ level: "warn", message, ...base }));
  },

  error: (message: string, meta: Meta = {}, req?: Request) => {
    const base = normalizeMeta(meta, {}, req);
    console.error(JSON.stringify({ level: "error", message, ...base }));
  },
};

export async function logError(
  error: Error | string,
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW",
  meta: Meta = {},
  traceId?: string
) {
  const message = typeof error === "string" ? error : error.message;
  const payload = normalizeMeta({ severity, error: message, traceId, ...meta }, {}, undefined);

  console.error(JSON.stringify({ level: "error", message, ...payload }));

  const shouldAlert = severity === "HIGH" || severity === "CRITICAL";
  const webhookUrl = process.env.ERROR_WEBHOOK_URL;

  if (!shouldAlert || !webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service: "Momentum",
        error: message,
        traceId: payload.traceId,
      }),
    });
  } catch (err: any) {
    console.error(
      JSON.stringify({
        level: "error",
        message: "Failed to post error webhook",
        severity,
        traceId: payload.traceId,
        error: err?.message,
      })
    );
  }
}
