import { db } from "src/services/firebase";
// functions/src/middleware/withSecrets.ts
import { defineSecret } from "firebase-functions/params";

export const OPENAI_KEY = defineSecret("OPENAI_API_KEY");
export const GEMINI_KEY = defineSecret("GEMINI_API_KEY");
export const STRIPE_KEY = defineSecret("STRIPE_API_KEY");
export const STRIPE_WEBHOOK = defineSecret("STRIPE_WEBHOOK_SECRET");

/** Use este array ao exportar suas functions http:
 *  export const api = onRequest({ secrets }, app);
 */
export const secrets = [OPENAI_KEY, GEMINI_KEY, STRIPE_KEY, STRIPE_WEBHOOK];



