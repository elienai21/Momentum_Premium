import apiClient from "@/services/api";

export async function api(
  path: string,
  _token?: string | null,
  init?: RequestInit,
) {
  const method = (init?.method ?? "GET").toUpperCase();
  const data = init?.body;
  const headers =
    init?.headers && typeof init.headers === "object" ? init.headers : undefined;

  const response = await apiClient.request({
    url: path,
    method,
    data,
    headers,
  });

  return response.data;
}
