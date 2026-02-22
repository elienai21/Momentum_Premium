import { auth } from "./firebase";
import { getCurrentTenantId } from "@/context/TenantContext";

function isSameOriginApiRequest(input: RequestInfo | URL) {
  const urlString =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input instanceof Request
          ? input.url
          : String(input);

  try {
    const base =
      typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const url = new URL(urlString, base);
    const sameOrigin =
      typeof window !== "undefined" ? url.origin === window.location.origin : true;
    return sameOrigin && url.pathname.startsWith("/api");
  } catch {
    return urlString.startsWith("/api");
  }
}

/**
 * Fetch wrapper that injects auth and tenant headers.
 * - Adds x-id-token when token exists
 * - Adds x-tenant-id when missing
 * - Never sends Authorization for same-origin /api calls
 * - Sets credentials: "include" by default (can be overridden)
 * - Auto-serializes plain object bodies to JSON (sets Content-Type)
 */
export async function authorizedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
) {
  const token = await auth.currentUser?.getIdToken();
  const headers = new Headers(init.headers || {});

  if (isSameOriginApiRequest(input)) {
    headers.delete("Authorization");
    headers.delete("authorization");
  }

  if (token) {
    headers.set("x-id-token", token);
  }

  const tenantId = getCurrentTenantId();
  if (!headers.has("x-tenant-id") && tenantId) {
    headers.set("x-tenant-id", tenantId as string);
  }

  let body = init.body;
  const isPlainObject =
    body &&
    typeof body === "object" &&
    !(body instanceof FormData) &&
    !(body instanceof Blob) &&
    !(body instanceof ArrayBuffer);

  if (isPlainObject) {
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    body = JSON.stringify(body);
  }

  return fetch(input, {
    ...init,
    headers,
    body,
    credentials: init.credentials ?? "include",
  });
}

export default authorizedFetch;
