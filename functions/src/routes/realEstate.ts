// functions/src/routes/realEstate.ts
import { Router } from "express";
import {
  listBuildings,
  createBuilding,
  updateBuilding,
  archiveBuilding,
  getPortfolioSummary,
  listOwners,
  listUnits
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

// Listing units and owners (already existing in service, exposing here for completeness if needed)
realEstateRouter.get("/owners", async (req: any, res) => {
  const tenantId = req.tenant.info.id;
  const owners = await listOwners(tenantId);
  res.json({ ok: true, owners });
});

realEstateRouter.get("/units", async (req: any, res) => {
  const tenantId = req.tenant.info.id;
  const units = await listUnits(tenantId);
  res.json({ ok: true, units });
});

export default realEstateRouter;
