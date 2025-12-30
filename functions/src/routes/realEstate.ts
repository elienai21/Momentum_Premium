// functions/src/routes/realEstate.ts
import { Router } from "express";
import {
  listBuildings,
  createBuilding,
  updateBuilding,
  archiveBuilding,
  getPortfolioSummary,
  listOwners,
  createOwner,
  listUnits,
  createUnit,
  listContracts,
  createContract,
  updateContract,
  deleteContract,
  initDocumentUpload,
  commitDocument,
  listDocuments,
  generateOwnerStatement,
  listOwnerStatements,
  generateReceivablesBatch,
  recordPayment,
  listReceivables,
  calculateAgingSnapshot,
  getAgingSnapshot,
} from "../services/realEstateService";
import { requireAuth } from "../middleware/requireAuth";
import { withTenant } from "../middleware/withTenant";
import { z } from "zod";
import {
  documentCommitSchema,
  documentInitUploadSchema,
  documentListQuerySchema,
  generateStatementSchema,
  statementListQuerySchema,
  receivableGenerateBatchSchema,
  receivableListQuerySchema,
  agingAnalyticsQuerySchema,
} from "../types/realEstate";

export const realEstateRouter = Router();

realEstateRouter.use(requireAuth, withTenant);

// Buildings
realEstateRouter.get("/buildings", async (req: any, res) => {
  const tenantId = req.tenant.info.id;
  const buildings = await listBuildings(tenantId);
  res.json({ ok: true, buildings });
});

const buildingSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
});

realEstateRouter.post("/buildings", async (req: any, res) => {
  const tenantId = req.tenant.info.id;
  const data = buildingSchema.parse(req.body);
  const building = await createBuilding(tenantId, data);
  res.json({ ok: true, building });
});

realEstateRouter.put("/buildings/:id", async (req: any, res) => {
  const tenantId = req.tenant.info.id;
  const data = buildingSchema.partial().parse(req.body);
  await updateBuilding(tenantId, req.params.id, data);
  res.json({ ok: true });
});

realEstateRouter.delete("/buildings/:id", async (req: any, res) => {
  const tenantId = req.tenant.info.id;
  await archiveBuilding(tenantId, req.params.id);
  res.json({ ok: true });
});

// Summary
realEstateRouter.get("/portfolio-summary", async (req: any, res) => {
  const tenantId = req.tenant.info.id;
  const days = parseInt(req.query.days as string) || 30;
  const summary = await getPortfolioSummary(tenantId, days);
  res.json({ ok: true, summary });
});

// Owners
const ownerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

realEstateRouter.get("/owners", async (req: any, res) => {
  const tenantId = req.tenant.info.id;
  const owners = await listOwners(tenantId);
  res.json({ ok: true, owners });
});

realEstateRouter.post("/owners", async (req: any, res) => {
  const tenantId = req.tenant.info.id;
  const data = ownerSchema.parse(req.body);
  const owner = await createOwner(tenantId, data);
  res.json({ ok: true, owner });
});

// Units
const unitSchema = z.object({
  code: z.string().min(1),
  ownerId: z.string().min(1),
  buildingId: z.string().optional(),
  name: z.string().optional(),
  bedrooms: z.number().optional(),
  bathrooms: z.number().optional(),
  nightlyRate: z.number().optional(),
});

const contractSchema = z.object({
  unitId: z.string().min(1),
  tenantName: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  rentAmount: z.number().positive(),
  readjustmentIndex: z.string().optional(),
});

realEstateRouter.get("/units", async (req: any, res) => {
  const tenantId = req.tenant.info.id;
  const units = await listUnits(tenantId);
  res.json({ ok: true, units });
});

realEstateRouter.post("/units", async (req: any, res) => {
  const tenantId = req.tenant.info.id;
  const data = unitSchema.parse(req.body);
  const unit = await createUnit(tenantId, data);
  res.json({ ok: true, unit });
});

// Contracts
realEstateRouter.get("/contracts", async (req: any, res) => {
  const tenantId = req.tenant.info.id;
  const unitId = (req.query.unitId as string) || undefined;
  const contracts = await listContracts(tenantId, unitId);
  res.json({ ok: true, contracts });
});

realEstateRouter.post("/contracts", async (req: any, res) => {
  const tenantId = req.tenant.info.id;
  const data = contractSchema.parse(req.body);
  const contract = await createContract(tenantId, data);
  res.json({ ok: true, contract });
});

realEstateRouter.put("/contracts/:id", async (req: any, res) => {
  const tenantId = req.tenant.info.id;
  const data = contractSchema.partial().parse(req.body);
  await updateContract(tenantId, req.params.id, data);
  res.json({ ok: true });
});

realEstateRouter.delete("/contracts/:id", async (req: any, res) => {
  const tenantId = req.tenant.info.id;
  await deleteContract(tenantId, req.params.id);
  res.json({ ok: true });
});

// Documents (stubs)
realEstateRouter.post("/documents/init-upload", async (req: any, res, next) => {
  try {
    const tenantId = req.tenant.info.id;
    const parsed = documentInitUploadSchema.parse(req.body);
    const result = await initDocumentUpload(tenantId, parsed, req.user);
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
});

realEstateRouter.post("/documents/commit", async (req: any, res, next) => {
  try {
    const tenantId = req.tenant.info.id;
    const parsed = documentCommitSchema.parse(req.body);
    const document = await commitDocument(tenantId, parsed, req.user);
    res.json({ ok: true, document });
  } catch (err) {
    next(err);
  }
});

realEstateRouter.get("/documents", async (req: any, res, next) => {
  try {
    const tenantId = req.tenant.info.id;
    const parsed = documentListQuerySchema.parse(req.query);
    const documents = await listDocuments(tenantId, parsed);
    res.json({ ok: true, documents });
  } catch (err) {
    next(err);
  }
});

// Statements (stubs)
realEstateRouter.post("/statements/generate", async (req: any, res, next) => {
  try {
    const tenantId = req.tenant.info.id;
    const parsed = generateStatementSchema.parse(req.body);
    const statement = await generateOwnerStatement(
      tenantId,
      parsed.ownerId,
      parsed.period,
      req.user?.uid
    );
    res.json({ ok: true, statement });
  } catch (err) {
    next(err);
  }
});

realEstateRouter.get("/statements", async (req: any, res, next) => {
  try {
    const tenantId = req.tenant.info.id;
    const parsed = statementListQuerySchema.parse(req.query);
    const statements = await listOwnerStatements(tenantId, parsed.ownerId);
    res.json({ ok: true, statements });
  } catch (err) {
    next(err);
  }
});

// Receivables & analytics (stubs)
realEstateRouter.post("/receivables/generate-batch", async (req: any, res, next) => {
  try {
    const tenantId = req.tenant.info.id;
    const parsed = receivableGenerateBatchSchema.parse(req.body);
    const result = await generateReceivablesBatch(tenantId, parsed.period);
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
});

realEstateRouter.get("/receivables", async (req: any, res, next) => {
  try {
    const tenantId = req.tenant.info.id;
    const parsed = receivableListQuerySchema.parse(req.query);
    const receivables = await listReceivables(tenantId, parsed);
    res.json({ ok: true, receivables });
  } catch (err) {
    next(err);
  }
});

realEstateRouter.post("/receivables/:id/payment", async (req: any, res, next) => {
  try {
    const tenantId = req.tenant.info.id;
    const bodySchema = z.object({
      amount: z.number().positive(),
      date: z.string().min(1),
    });
    const parsed = bodySchema.parse(req.body);
    const receivable = await recordPayment(tenantId, req.params.id, parsed.amount, parsed.date);
    res.json({ ok: true, receivable });
  } catch (err) {
    next(err);
  }
});

realEstateRouter.get("/analytics/aging", async (req: any, res, next) => {
  try {
    const tenantId = req.tenant.info.id;
    agingAnalyticsQuerySchema.parse(req.query ?? {});
    const existing = await getAgingSnapshot(tenantId);
    if (existing) {
      res.json({ ok: true, aging: existing });
      return;
    }
    const aging = await calculateAgingSnapshot(tenantId);
    res.json({ ok: true, aging });
  } catch (err) {
    next(err);
  }
});

export default realEstateRouter;
