// web/src/api/api.ts
import axios from "axios";
import { getCurrentTenantId } from "@/context/TenantContext";

// Opcional: callback para integrar com useAuthToken (se quiser reaproveitar)
let getTokenFn: (() => string | null) | null = null;

export const registerTokenGetter = (fn: () => string | null) => {
  getTokenFn = fn;
};

export const api = axios.create({
  baseURL: "/",
  withCredentials: true,
});

function shouldStripAuthorization(config: any) {
  const baseURL = String(config.baseURL ?? api.defaults.baseURL ?? "");
  const url = String(config.url ?? "");
  const isRelativeBase = !/^https?:\/\//i.test(baseURL);
  const isApiPath = url.startsWith("/api") || baseURL.includes("/api");
  return isRelativeBase && isApiPath;
}

api.interceptors.request.use((config) => {
  const headers: Record<string, any> = { ...(config.headers ?? {}) };

  if (shouldStripAuthorization(config)) {
    delete headers.Authorization;
    delete headers.authorization;
  }

  const token = getTokenFn?.();
  if (token) {
    headers["x-id-token"] = token;
  }

  headers["x-tenant-id"] = getCurrentTenantId();
  config.headers = headers;

  return config;
});

export default api;
