import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth";
import { requireFeature } from "../middleware/requireFeature";
import {
  createOwner,
  listOwners,
  createUnit,
  listUnits,
  registerStayFromStaysCsv,
  registerExpenseFromPayload,
  listStaysByUnit,
  listExpensesByUnit,
  generateMonthlyStatement,
  getOrGenerateMonthlyStatement,
} from "../services/realEstateService";

type AuthedRequest = {
  tenant?: { info?: { id?: string } };
  user?: { tenantId?: string };
  body: any;
  query: any;
  params: any;
};

function getTenantId(req: AuthedRequest): string | null {
  return (
    req.tenant?.info?.id ||
    req.user?.tenantId ||
    (req.query?.tenantId as string) ||
    null
  );
}

export const realEstateRouter = Router();

realEstateRouter.use(requireAuth);
realEstateRouter.use(requireFeature("real_estate"));

const staysCsvSchema = z.object({
  unitCode: z.string().min(1),
  checkIn: z.string().min(1),
  checkOut: z.string().min(1),
  nights: z.number().int().positive().optional(),
  grossRevenue: z.number().optional(),
  cleaningFees: z.number().optional(),
  platformFees: z.number().optional(),
  otherCosts: z.number().optional(),
  source: z.string().optional(),
  bookingId: z.string().optional(),
  guestName: z.string().optional(),
  guestEmail: z.string().optional(),
  guestPhone: z.string().optional(),
  createdAt: z.string().optional(),
  raw: z.record(z.any()).optional(),
});

const expensePayloadSchema = z.object({
  unitCode: z.string().min(1),
  category: z.string().min(1),
  amount: z.number().positive(),
  incurredAt: z.string().min(1),
  description: z.string().optional(),
  vendor: z.string().optional(),
  source: z.string().optional(),
});

realEstateRouter.post("/owners", async (req, res) => {
  const tenantId = getTenantId(req as any);
  if (!tenantId) return res.status(400).json({ ok: false, error: "tenant_required" });
  const { name, email, phone, taxId } = req.body || {};
  const owner = await createOwner(tenantId, { name, email, phone, taxId });
  res.json({ ok: true, owner });
});

realEstateRouter.get("/owners", async (req, res) => {
  const tenantId = getTenantId(req as any);
  if (!tenantId) return res.status(400).json({ ok: false, error: "tenant_required" });
  const owners = await listOwners(tenantId);
  res.json({ ok: true, owners });
});

realEstateRouter.post("/units", async (req, res) => {
  const tenantId = getTenantId(req as any);
  if (!tenantId) return res.status(400).json({ ok: false, error: "tenant_required" });
  const { ownerId, code, name, bedrooms, bathrooms, nightlyRate } = req.body || {};
  const unit = await createUnit(tenantId, {
    ownerId,
    code,
    name,
    bedrooms,
    bathrooms,
    nightlyRate,
  });
  res.json({ ok: true, unit });
});

realEstateRouter.get("/units", async (req, res) => {
  const tenantId = getTenantId(req as any);
  if (!tenantId) return res.status(400).json({ ok: false, error: "tenant_required" });
  const units = await listUnits(tenantId);
  res.json({ ok: true, units });
});

realEstateRouter.post("/stays", async (req, res) => {
  const tenantId = getTenantId(req as any);
  if (!tenantId) return res.status(400).json({ ok: false, error: "tenant_required" });
  try {
    const payload = staysCsvSchema.parse(req.body);
    const stay = await registerStayFromStaysCsv(tenantId, payload);
    res.json({ ok: true, stay });
  } catch (err: any) {
    const status = err?.statusCode || 400;
    res.status(status).json({ ok: false, error: err?.message || "invalid_request" });
  }
});

realEstateRouter.post("/expenses", async (req, res) => {
  const tenantId = getTenantId(req as any);
  if (!tenantId) return res.status(400).json({ ok: false, error: "tenant_required" });
  try {
    const payload = expensePayloadSchema.parse(req.body);
    const expense = await registerExpenseFromPayload(tenantId, payload);
    res.json({ ok: true, expense });
  } catch (err: any) {
    const status = err?.statusCode || 400;
    res.status(status).json({ ok: false, error: err?.message || "invalid_request" });
  }
});

realEstateRouter.get("/statements/:ownerId", async (req, res) => {
  const tenantId = getTenantId(req as any);
  if (!tenantId) return res.status(400).json({ ok: false, error: "tenant_required" });
  const ownerId = req.params.ownerId;
  const month = req.query?.month as string;
  if (!ownerId) return res.status(400).json({ ok: false, error: "owner_required" });
  if (!month) return res.status(400).json({ ok: false, error: "month_required" });
  try {
    const statement = await getOrGenerateMonthlyStatement(tenantId, ownerId, month);
    res.json({ ok: true, statement });
  } catch (err: any) {
    const status = err?.statusCode || 500;
    res.status(status).json({ ok: false, error: err?.message || "statement_error" });
  }
});

realEstateRouter.get("/stays/:unitId", async (req, res) => {
  const tenantId = getTenantId(req as any);
  if (!tenantId) return res.status(400).json({ ok: false, error: "tenant_required" });
  const unitId = req.params.unitId;
  const stays = await listStaysByUnit(tenantId, unitId);
  res.json({ ok: true, stays });
});

realEstateRouter.get("/expenses/:unitId", async (req, res) => {
  const tenantId = getTenantId(req as any);
  if (!tenantId) return res.status(400).json({ ok: false, error: "tenant_required" });
  const unitId = req.params.unitId;
  const expenses = await listExpensesByUnit(tenantId, unitId);
  res.json({ ok: true, expenses });
});

export default realEstateRouter;
