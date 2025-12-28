// ============================================================
// 🧩 Vision Router — Momentum AI OCR Module (v9.5)
// ============================================================

import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { visionAI } from "../services/visionAI";


export const visionRouter = Router();

// 📤 Upload + OCR + IA
visionRouter.post("/", requireAuth, visionAI);
