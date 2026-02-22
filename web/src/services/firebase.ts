/**
 * ============================================================
 * 🔥 Firebase Web SDK — Momentum Platform v9.6 (Final)
 * ============================================================
 * - Evita o erro app/duplicate-app (HMR/Vite)
 * - Garante inicialização única e segura
 * - Loga variáveis de ambiente para depuração
 * ============================================================
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { API_URL } from "@/config/api";

// ============================================================
// 🌐 Configuração via variáveis do Vite (.env ou .env.production)
// ============================================================

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

if (import.meta.env.DEV) {
  console.log("🔥 Firebase config carregado:", firebaseConfig);
  console.log("🔍 Variáveis do ambiente Vite:");
  console.log("API_KEY:", import.meta.env.VITE_FIREBASE_API_KEY);
  console.log("API_URL:", API_URL);
  console.log("ENVIRONMENT:", import.meta.env.VITE_ENV);
}

// ============================================================
// 🚀 Inicialização segura (previne 'duplicate-app')
// ============================================================

let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  if (import.meta.env.DEV) {
    console.log("✅ Firebase inicializado com sucesso");
  }
} else {
  app = getApp();
  if (import.meta.env.DEV) {
    console.log("⚙️ Firebase App reutilizado (já inicializado)");
  }
}

// ============================================================
// 🧩 Exporta instâncias dos serviços
// ============================================================

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;

// ============================================================
// 🔑 Debug: Loga token do usuário autenticado (apenas dev)
// ============================================================
if (import.meta.env.DEV) {
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      const token = await user.getIdToken();
      console.log("🔑 Firebase ID Token:", token);
    } else {
      console.log("❌ Nenhum usuário autenticado.");
    }
  });
}

// Expor o auth globalmente só para debug no navegador (apenas dev)
// NÃO tem impacto na segurança do backend, é só para facilitar testes
if (import.meta.env.DEV) {
  // @ts-ignore
  ;(window as any).momentumAuth = auth;
}

