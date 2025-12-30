// ============================================================
// Firebase Admin Safe Init — Momentum (v9.2)
// ============================================================

import * as admin from "firebase-admin";

let app: admin.app.App;
const apps = Array.isArray((admin as any).apps) ? admin.apps : [];
const hasInitialize = typeof (admin as any).initializeApp === "function";
const hasAppGetter = typeof (admin as any).app === "function";

if (!apps.length) {
  app = hasInitialize ? admin.initializeApp() : ({} as any); // usa as credenciais padrão do ambiente Cloud Functions
  if (hasInitialize && process.env.NODE_ENV !== "test") {
    // eslint-disable-next-line no-console
    console.log("🔥 Firebase Admin inicializado com sucesso");
  }
} else {
  app = hasAppGetter ? admin.app() : ({} as any);
}

const fallbackDb = {
  collection: () => ({
    doc: () => ({
      set: async () => undefined,
    }),
    add: async () => ({ id: "mock-id" }),
    where: () => ({ get: async () => ({ docs: [] }) }),
  }),
  runTransaction: async (fn: any) => fn({
    get: async () => ({ exists: false, data: () => null }),
    set: async () => undefined,
    update: async () => undefined,
    delete: async () => undefined,
  }),
};

const fallbackAuth = {
  verifyIdToken: async () => ({ uid: "mock-user" }),
  getUser: async () => ({ uid: "mock-user" }),
};

const fallbackStorage = {
  bucket: () => ({
    file: () => ({
      getSignedUrl: async () => "",
    }),
  }),
};

export const db =
  typeof (admin as any).firestore === "function"
    ? admin.firestore(app)
    : (fallbackDb as any);
export const auth =
  typeof (admin as any).auth === "function"
    ? admin.auth(app)
    : (fallbackAuth as any);
export const storage =
  typeof (admin as any).storage === "function"
    ? admin.storage(app)
    : (fallbackStorage as any);
