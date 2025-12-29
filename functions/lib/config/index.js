"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FEATURES_DEFAULT = exports.DEFAULT_LOCALE = exports.REGION = exports.OPENAI_KEY = exports.GEMINI_KEY = exports.STRIPE_KEY = void 0;
const params_1 = require("firebase-functions/params");
exports.STRIPE_KEY = (0, params_1.defineSecret)("STRIPE_API_KEY");
exports.GEMINI_KEY = (0, params_1.defineSecret)("GEMINI_API_KEY");
exports.OPENAI_KEY = (0, params_1.defineSecret)("OPENAI_API_KEY");
// ✅ Unificado
exports.REGION = "southamerica-east1";
exports.DEFAULT_LOCALE = "pt-BR";
exports.FEATURES_DEFAULT = {
    pdfExport: true,
    aiReconciliation: true,
    advisorActions: true,
    // ...
};
