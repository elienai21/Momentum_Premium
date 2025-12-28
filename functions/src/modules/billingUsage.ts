import { db } from "src/services/firebase";
// functions/src/modules/billingUsage.ts
import { Router } from "express";
import { z } from "zod";

import { requireAuth } from "../middleware/requireAuth";
import { reportUsageToStripe } from "src/utils/usageTracker";

export const billingRouter = Router();

billingRouter.get("/api/billing/usage", requireAuth, async (req, res) => {
  const tenantId = (req.user?.tenantId as string) || "default";
  const logs = await db
    .collection("usage_logs")
    .where("tenantId", "==", tenantId)
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();

  res.json(logs.docs.map((d: FirebaseFirestore.QueryDocumentSnapshot) => d.data()));
});

billingRouter.post("/api/billing/report", requireAuth, async (req, res) => {
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

  await reportUsageToStripe(subscriptionItemId, amountCents);
  res.json({ status: "ok" });
});



