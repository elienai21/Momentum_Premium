import { getCurrentTenantId } from "@/context/TenantContext";

export async function api(
  path: string,
  token?: string | null,
  init?: RequestInit,
) {
  const headers = new Headers(init?.headers || {});

  // Nunca enviar Firebase ID token em Authorization para /api (Cloud Run IAM usa Authorization internamente).
  headers.delete("Authorization");
  headers.delete("authorization");

  if (token) {
    headers.set("x-id-token", token);
  }
  if (!headers.has("x-tenant-id")) {
    headers.set("x-tenant-id", getCurrentTenantId());
  }

  const res = await fetch(`/api${path}`, { ...init, headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
