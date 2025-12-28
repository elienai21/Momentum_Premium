// functions/src/config/index.ts
import { db } from "src/services/firebase";
import { defineSecret } from "firebase-functions/params";

export const STRIPE_KEY = defineSecret("STRIPE_API_KEY");
export const GEMINI_KEY = defineSecret("GEMINI_API_KEY");
export const OPENAI_KEY = defineSecret("OPENAI_API_KEY");

// ✅ Unificado
export const REGION = "southamerica-east1";

export const DEFAULT_LOCALE = "pt-BR";

export const FEATURES_DEFAULT = {
  pdfExport: true,
  aiReconciliation: true,
  advisorActions: true,
  // ...
};

