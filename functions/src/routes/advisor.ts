import { db } from "src/services/firebase";
import express from "express";
import { runAdvisor } from "../ai/advisor";
import { requireAuth } from "../middleware/requireAuth";
import { withTenant } from "../middleware/withTenant";

const router = express.Router();

// POST /api/advisor
router.post("/", requireAuth, withTenant, runAdvisor);

export default router;



