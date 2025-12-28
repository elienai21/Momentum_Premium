import { describe, expect, it, vi } from "vitest";

const fakeUser = {
  getIdToken: vi.fn(async () => "FAKE_ID_TOKEN"),
};
const fakeAuth = {
  currentUser: fakeUser,
};

vi.mock("../firebase", () => ({
  auth: fakeAuth,
}));

vi.mock("@/context/TenantContext", () => ({
  getCurrentTenantId: () => "tenant-test",
}));

describe("services/api auth headers", () => {
  it("não envia Authorization quando baseURL é /api e injeta x-id-token/x-tenant-id", async () => {
    const { default: api } = await import("../api");

    api.defaults.baseURL = "/api";

    const adapter = vi.fn(async (config: any) => ({
      data: {},
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    }));

    await api.get("/pulse/health", {
      adapter,
      headers: {
        Authorization: "Bearer SHOULD_BE_STRIPPED",
      },
    });

    const reqConfig = adapter.mock.calls[0][0] as any;
    const headers =
      typeof reqConfig.headers?.toJSON === "function"
        ? reqConfig.headers.toJSON()
        : reqConfig.headers;

    expect(headers.Authorization).toBeUndefined();
    expect(headers.authorization).toBeUndefined();
    expect(headers["x-id-token"]).toBe("FAKE_ID_TOKEN");
    expect(headers["x-tenant-id"]).toBe("tenant-test");
  });
});
