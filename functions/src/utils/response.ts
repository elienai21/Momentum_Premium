import { db } from "src/services/firebase";




import { Response } from "express";

export const ok = (res: Response, data: any) => res.status(200).json({ ok: true, data });
export const badRequest = (res: Response, msg = "Bad Request") => res.status(400).json({ ok: false, error: msg });
export const unauthorized = (res: Response) => res.status(401).json({ ok: false, error: "Unauthorized" });
export const forbidden = (res: Response) => res.status(403).json({ ok: false, error: "Forbidden" });
export const serverError = (res: Response, traceId?: string | number | string[] | undefined) => res.status(500).json({ ok: false, error: "Internal Server Error", traceId: traceId || null });


