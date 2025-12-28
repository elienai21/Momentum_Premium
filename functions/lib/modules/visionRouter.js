"use strict";
// ============================================================
// 🧩 Vision Router — Momentum AI OCR Module (v9.5)
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.visionRouter = void 0;
const express_1 = require("express");
const requireAuth_1 = require("../middleware/requireAuth");
const visionAI_1 = require("../services/visionAI");
exports.visionRouter = (0, express_1.Router)();
// 📤 Upload + OCR + IA
exports.visionRouter.post("/", requireAuth_1.requireAuth, visionAI_1.visionAI);
