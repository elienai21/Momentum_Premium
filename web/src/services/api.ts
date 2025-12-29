// web/src/services/api.ts
import axios from "axios";
import { onAuthStateChanged, User } from "firebase/auth";
import { API_URL } from "@/config/api";
import { getCurrentTenantId } from "@/context/TenantContext";
import { auth } from "./firebase";

// Instância global do Axios apontando para /api (ou VITE_API_URL)
export const api = axios.create({
  baseURL: API_URL,
  timeout: 60_000,
});

type AnyHeaders = Record<string, any>;

function isHttpUrl(url: string) {
  return /^https?:\/\//i.test(url);
}

function isSameOrigin(url: string) {
  if (typeof window === "undefined") return false;
  try {
    const origin = new URL(url, window.location.origin).origin;
    return origin === window.location.origin;
  } catch {
    return false;
  }
}

function shouldStripAuthorization(config: any) {
  const baseURL = String(config.baseURL ?? api.defaults.baseURL ?? API_URL ?? "");
  // Base relativa (/api) ou mesma origem (Firebase Hosting) => NUNCA enviar Authorization.
  return !isHttpUrl(baseURL) || isSameOrigin(baseURL);
}

// Espera o Firebase Auth terminar de inicializar e devolve o usuário (ou null)
async function waitForAuthUser(): Promise<User | null> {
  if (auth.currentUser) return auth.currentUser;

  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

// Interceptor: injeta x-id-token + x-tenant-id em TODAS as chamadas
api.interceptors.request.use(async (config) => {
  const user = await waitForAuthUser();
  const headers: AnyHeaders = { ...(config.headers || {}) };

  if (shouldStripAuthorization(config)) {
    delete headers.Authorization;
    delete headers.authorization;
  }

  if (user) {
    const token = await user.getIdToken();
    headers["x-id-token"] = token;
  } else if (import.meta.env.DEV) {
    console.warn("[API] Chamada sem usuário autenticado:", config.url);
  }

  headers["x-tenant-id"] = getCurrentTenantId();
  config.headers = headers;

  return config;
});

// Interceptor de resposta: normaliza erro e loga 401/403/402
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const code = error?.response?.data?.code;
    const msg =
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      error?.message ||
      "Falha de rede. Tente novamente.";

    if (status === 401) {
      console.error("[API] 401 Unauthorized — verifique x-id-token e x-tenant-id.", {
        url: error?.config?.url,
      });
    }

    // 402 NO_CREDITS: Dispatch global event for modal
    if (status === 402 || code === "NO_CREDITS") {
      console.warn("[API] 402 No Credits — créditos insuficientes", {
        url: error?.config?.url,
      });
      // Dispatch custom event for BuyCreditsModal
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("no-credits", { detail: { url: error?.config?.url } }));
      }
    }

    if (status === 403 && error?.response?.data?.feature) {
      console.warn("[API] 403 Upgrade required", error?.response?.data);
    }

    return Promise.reject({ status, message: msg, code, raw: error?.response?.data });
  },
);

export default api;
