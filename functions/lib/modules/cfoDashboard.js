"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cfoRouter = void 0;
const firebase_1 = require("../services/firebase");
// functions/src/modules/cfoDashboard.ts
const express_1 = require("express");
const financialReports_1 = require("../utils/financialReports");
const dualClient_1 = require("../ai/dualClient");
// Se seu projeto já tem um requireAuth, use-o.
// Caso contrário, mantenha as checagens defensivas (req.user?).
const requireAuth_1 = require("../middleware/requireAuth");
exports.cfoRouter = (0, express_1.Router)();
exports.cfoRouter.get("/api/cfo/summary", requireAuth_1.requireAuth, async (req, res) => {
    const tenantId = req.user?.tenantId || "default";
    const snap = await firebase_1.db
        .collection("transactions")
        .where("tenantId", "==", tenantId)
        .limit(5000)
        .get();
    const txs = snap.docs.map((d) => d.data());
    const kpis = (0, financialReports_1.calcKPIs)(txs);
    const dre = (0, financialReports_1.generateDRE)(txs);
    res.json({ kpis, dre });
});
exports.cfoRouter.post("/api/cfo/ai-report", requireAuth_1.requireAuth, async (req, res) => {
    const tenantId = req.user?.tenantId || "default";
    const { provider, prompt } = req.body;
    const out = await (0, dualClient_1.runDualAI)({ prompt, provider, tenantId });
    res.json(out);
});
