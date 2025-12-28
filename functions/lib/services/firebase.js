"use strict";
// ============================================================
// Firebase Admin Safe Init — Momentum (v9.2)
// ============================================================
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.storage = exports.auth = exports.db = void 0;
const admin = __importStar(require("firebase-admin"));
let app;
const apps = Array.isArray(admin.apps) ? admin.apps : [];
const hasInitialize = typeof admin.initializeApp === "function";
const hasAppGetter = typeof admin.app === "function";
if (!apps.length) {
    app = hasInitialize ? admin.initializeApp() : {}; // usa as credenciais padrão do ambiente Cloud Functions
    if (hasInitialize && process.env.NODE_ENV !== "test") {
        // eslint-disable-next-line no-console
        console.log("🔥 Firebase Admin inicializado com sucesso");
    }
}
else {
    app = hasAppGetter ? admin.app() : {};
}
const fallbackDb = {
    collection: () => ({
        doc: () => ({
            set: async () => undefined,
        }),
        add: async () => ({ id: "mock-id" }),
        where: () => ({ get: async () => ({ docs: [] }) }),
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
exports.db = typeof admin.firestore === "function"
    ? admin.firestore(app)
    : fallbackDb;
exports.auth = typeof admin.auth === "function"
    ? admin.auth(app)
    : fallbackAuth;
exports.storage = typeof admin.storage === "function"
    ? admin.storage(app)
    : fallbackStorage;
