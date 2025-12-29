"use strict";
// ============================================================
// 🌐 Momentum API Router — v9.5 Enterprise Stable
// ============================================================
// 🔹 Estrutura modular unificada (Text, Voice, Vision AI)
// 🔹 Corrige rotas duplicadas e mantém compatibilidade retroativa
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = exports.apiRouter = void 0;
const express_1 = require("express");
// ============================
// 🔸 Core Modules
// ============================
const admin_1 = require("./modules/admin");
const portal_1 = require("./modules/portal");
const support_1 = require("./modules/support");
const goals_1 = require("./modules/goals");
const tenants_1 = require("./modules/tenants");
const billing_1 = require("./modules/billing");
const cards_1 = require("./modules/cards");
const analytics_1 = require("./modules/analytics");
const forecast_1 = require("./modules/forecast");
const compliance_1 = require("./modules/compliance");
const accounts_1 = require("./modules/accounts");
const payments_1 = require("./modules/payments");
const ai_1 = require("./modules/ai");
const voice_1 = require("./modules/voice");
const chat_1 = require("./modules/chat");
const public_1 = require("./modules/public");
// ============================
// 🔸 AI / Services
// ============================
const advisor_1 = require("./ai/advisor");
const advisorVoice_1 = require("./ai/advisorVoice");
const voiceNeural_1 = require("./services/voiceNeural");
const visionAI_1 = require("./services/visionAI");
const voice_2 = require("./services/voice");
// ============================
// 🔸 Verticals
// ============================
const finance_1 = require("./modules/verticals/finance");
const realEstate_1 = require("./modules/verticals/realEstate");
const condos_1 = require("./modules/verticals/condos");
// ============================================================
// 🧠 MAIN ROUTER
// ============================================================
exports.apiRouter = (0, express_1.Router)();
// ============================================================
// 🔓 PUBLIC ACCESS
// ============================================================
exports.apiRouter.use("/public", public_1.publicRouter);
// ============================================================
// 🧩 CORE APP FEATURES
// ============================================================
exports.apiRouter.use("/tenants", tenants_1.tenantsRouter);
exports.apiRouter.use("/portal", portal_1.portalRouter);
exports.apiRouter.use("/dashboard", portal_1.portalRouter); // alias
exports.apiRouter.use("/admin", admin_1.adminRouter);
exports.apiRouter.use("/support", support_1.supportRouter);
exports.apiRouter.use("/goals", goals_1.goalsRouter);
exports.apiRouter.use("/cards", cards_1.cardsRouter);
exports.apiRouter.use("/analytics", analytics_1.router);
exports.apiRouter.use("/forecast", forecast_1.forecastRouter);
exports.apiRouter.use("/accounts", accounts_1.accountsRouter);
exports.apiRouter.use("/payments", payments_1.paymentsRouter);
exports.apiRouter.use("/billing", billing_1.router);
exports.apiRouter.use("/compliance", compliance_1.complianceRouter);
exports.apiRouter.use("/ai", ai_1.aiRouter);
exports.apiRouter.use("/chat", chat_1.chatRouter);
exports.apiRouter.use("/voice", voice_1.voiceRouter);
// ============================================================
// 🤖 AI & INTELLIGENT SERVICES
// ============================================================
// 💬 IA de texto (Advisor Financeiro)
exports.apiRouter.post("/ai/advisor", advisor_1.runAdvisor);
// 🎧 IA de voz (fala → IA → fala)
exports.apiRouter.post("/ai/advisor/voice", voice_2.upload.single("audio"), advisorVoice_1.advisorVoice);
// 🔊 TTS Neural (texto → voz natural)
exports.apiRouter.post("/ai/voice/tts", voiceNeural_1.voiceNeural);
// 🧠 Reconhecimento de fala (fala → texto natural)
exports.apiRouter.post("/ai/voice/stt", voice_2.upload.single("audio"), voice_2.voiceHandler);
// 👁️ OCR + Análise contábil de imagem
exports.apiRouter.post("/ai/vision", visionAI_1.visionAI);
// ============================================================
// 🏢 VERTICALS
// ============================================================
exports.apiRouter.use("/verticals/finance", finance_1.financeRouter);
exports.apiRouter.use("/verticals/real-estate", realEstate_1.realEstateRouter);
exports.apiRouter.use("/verticals/condos", condos_1.condosRouter);
// ============================================================
// ✅ EXPORT
// ============================================================
exports.router = exports.apiRouter;
