// ============================================================
// 🌐 Momentum API Router — v9.5 Enterprise Stable
// ============================================================
// 🔹 Estrutura modular unificada (Text, Voice, Vision AI)
// 🔹 Corrige rotas duplicadas e mantém compatibilidade retroativa
// ============================================================

import { Router } from "express";
import { db } from "src/services/firebase";

// ============================
// 🔸 Core Modules
// ============================
import { adminRouter } from "./modules/admin";
import { portalRouter } from "./modules/portal";
import { supportRouter } from "./modules/support";
import { goalsRouter } from "./modules/goals";
import { tenantsRouter } from "./modules/tenants";
import { router as billingRouter } from "./modules/billing";
import { cardsRouter } from "./modules/cards";
import { router as analyticsRouter } from "./modules/analytics";
import { forecastRouter } from "./modules/forecast";
import { complianceRouter } from "./modules/compliance";
import { accountsRouter } from "./modules/accounts";
import { paymentsRouter } from "./modules/payments";
import { aiRouter } from "./modules/ai";
import { voiceRouter } from "./modules/voice";
import { chatRouter } from "./modules/chat";
import { publicRouter } from "./modules/public";

// ============================
// 🔸 AI / Services
// ============================
import { runAdvisor } from "./ai/advisor";
import { advisorVoice } from "./ai/advisorVoice";
import { voiceNeural } from "./services/voiceNeural";
import { visionAI } from "./services/visionAI";
import { voiceHandler, upload } from "./services/voice";

// ============================
// 🔸 Verticals
// ============================
import { financeRouter } from "./modules/verticals/finance";
import { realEstateRouter } from "./modules/verticals/realEstate";
import { condosRouter } from "./modules/verticals/condos";

// ============================================================
// 🧠 MAIN ROUTER
// ============================================================
export const apiRouter = Router();

// ============================================================
// 🔓 PUBLIC ACCESS
// ============================================================
apiRouter.use("/public", publicRouter);

// ============================================================
// 🧩 CORE APP FEATURES
// ============================================================
apiRouter.use("/tenants", tenantsRouter);
apiRouter.use("/portal", portalRouter);
apiRouter.use("/dashboard", portalRouter); // alias
apiRouter.use("/admin", adminRouter);
apiRouter.use("/support", supportRouter);
apiRouter.use("/goals", goalsRouter);
apiRouter.use("/cards", cardsRouter);
apiRouter.use("/analytics", analyticsRouter);
apiRouter.use("/forecast", forecastRouter);
apiRouter.use("/accounts", accountsRouter);
apiRouter.use("/payments", paymentsRouter);
apiRouter.use("/billing", billingRouter);
apiRouter.use("/compliance", complianceRouter);
apiRouter.use("/ai", aiRouter);
apiRouter.use("/chat", chatRouter);
apiRouter.use("/voice", voiceRouter);

// ============================================================
// 🤖 AI & INTELLIGENT SERVICES
// ============================================================

// 💬 IA de texto (Advisor Financeiro)
apiRouter.post("/ai/advisor", runAdvisor);

// 🎧 IA de voz (fala → IA → fala)
apiRouter.post("/ai/advisor/voice", upload.single("audio"), advisorVoice);

// 🔊 TTS Neural (texto → voz natural)
apiRouter.post("/ai/voice/tts", voiceNeural);

// 🧠 Reconhecimento de fala (fala → texto natural)
apiRouter.post("/ai/voice/stt", upload.single("audio"), voiceHandler);

// 👁️ OCR + Análise contábil de imagem
apiRouter.post("/ai/vision", visionAI);

// ============================================================
// 🏢 VERTICALS
// ============================================================
apiRouter.use("/verticals/finance", financeRouter);
apiRouter.use("/verticals/real-estate", realEstateRouter);
apiRouter.use("/verticals/condos", condosRouter);

// ============================================================
// ✅ EXPORT
// ============================================================
export const router = apiRouter;

