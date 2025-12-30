import { db } from "src/services/firebase";
// functions/src/modules/billingUsage.ts
import { Router } from "express";
import { z } from "zod";

import { requireAuth } from "../middleware/requireAuth";
import { withTenant } from "../middleware/withTenant";
import { reportUsageToStripe } from "src/utils/usageTracker";
import { subscriptionItemBelongsToTenant } from "../utils/subscriptionItemGuard";

export const billingRouter = Router();

billingRouter.use(requireAuth as any, withTenant as any);

billingRouter.get("/api/billing/usage", async (req, res) => {
  const tenantId = (req.tenant?.info?.id as string) || (req.user?.tenantId as string);
  if (!tenantId) {
    return res.status(400).json({ error: "Tenant context required" });
  }
  const logs = await db
    .collection("usage_logs")
    .where("tenantId", "==", tenantId)
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();

  res.json(logs.docs.map((d: FirebaseFirestore.QueryDocumentSnapshot) => d.data()));
});

billingRouter.post("/api/billing/report", async (req, res) => {
  const body = req.body || {};
  const schema = z.union([
    z.object({
      subscriptionItemId: z.string().min(1),
      amountCents: z.number().int().nonnegative(),
    }),
    z.object({
      subscriptionItemId: z.string().min(1),
      tokens: z.number().int().nonnegative(),
    }),
  ]);

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.toString() });
  }

  const subscriptionItemId = parsed.data.subscriptionItemId;
  const amountCents = "amountCents" in parsed.data ? parsed.data.amountCents : parsed.data.tokens;

  const tenantId = (req.tenant?.info?.id as string) || (req.user?.tenantId as string);
  if (!tenantId) {
    return res.status(400).json({ error: "Tenant context required" });
  }

  const belongsToTenant = await subscriptionItemBelongsToTenant(tenantId, subscriptionItemId);
  if (!belongsToTenant) {
    return res.status(403).json({ error: "Subscription item does not belong to tenant" });
  }

  await reportUsageToStripe(subscriptionItemId, amountCents);
  res.json({ status: "ok" });
});


