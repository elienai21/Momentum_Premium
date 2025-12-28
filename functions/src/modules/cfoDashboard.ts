import { db } from "src/services/firebase";
// functions/src/modules/cfoDashboard.ts
import { Router } from "express";

import { generateDRE, calcKPIs, Tx } from "../utils/financialReports";
import { runDualAI } from "../ai/dualClient";

// Se seu projeto já tem um requireAuth, use-o.
// Caso contrário, mantenha as checagens defensivas (req.user?).
import { requireAuth } from "../middleware/requireAuth";

export const cfoRouter = Router();

cfoRouter.get("/api/cfo/summary", requireAuth, async (req, res) => {
  const tenantId = (req.user?.tenantId as string) || "default";
  const snap = await db
    .collection("transactions")
    .where("tenantId", "==", tenantId)
    .limit(5000)
    .get();

  const txs = snap.docs.map((d: FirebaseFirestore.QueryDocumentSnapshot) => d.data() as Tx);
  const kpis = calcKPIs(txs);
  const dre = generateDRE(txs);

  res.json({ kpis, dre });
});

cfoRouter.post("/api/cfo/ai-report", requireAuth, async (req, res) => {
  const tenantId = (req.user?.tenantId as string) || "default";
  const { provider, prompt } = req.body as { provider: "openai" | "gemini"; prompt: string };
  const out = await runDualAI({ prompt, provider, tenantId });
  res.json(out);
});



