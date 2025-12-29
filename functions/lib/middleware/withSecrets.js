"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.secrets = exports.STRIPE_WEBHOOK = exports.STRIPE_KEY = exports.GEMINI_KEY = exports.OPENAI_KEY = void 0;
// functions/src/middleware/withSecrets.ts
const params_1 = require("firebase-functions/params");
exports.OPENAI_KEY = (0, params_1.defineSecret)("OPENAI_API_KEY");
exports.GEMINI_KEY = (0, params_1.defineSecret)("GEMINI_API_KEY");
exports.STRIPE_KEY = (0, params_1.defineSecret)("STRIPE_API_KEY");
exports.STRIPE_WEBHOOK = (0, params_1.defineSecret)("STRIPE_WEBHOOK_SECRET");
/** Use este array ao exportar suas functions http:
 *  export const api = onRequest({ secrets }, app);
 */
exports.secrets = [exports.OPENAI_KEY, exports.GEMINI_KEY, exports.STRIPE_KEY, exports.STRIPE_WEBHOOK];
