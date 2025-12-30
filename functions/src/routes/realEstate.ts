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
} from "../services/realEstateService";
import { requireAuth } from "../middleware/requireAuth";
import { withTenant } from "../middleware/withTenant";
import { z } from "zod";

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

export default realEstateRouter;
