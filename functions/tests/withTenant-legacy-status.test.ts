import request from "supertest";

describe("withTenant legacy member status", () => {
  it("does not 403 when member status is missing (legacy)", async () => {
    jest.resetModules();

    jest.doMock("firebase-admin", () => {
      const makeSnap = (id: string, data: any, exists = true) => ({
        exists,
        id,
        data: () => data,
        get: (field: string) => (data ? data[field] : undefined),
      });

      const firestoreMock = {
        doc: jest.fn((path: string) => ({
          get: jest.fn(async () => {
            if (path === "tenants/t1") {
              return makeSnap("t1", { plan: "starter" });
            }
            if (path === "tenants/t1/members/u1") {
              // Legacy member: no `status`
              return makeSnap("u1", { role: "admin" });
            }
            return makeSnap(path.split("/").pop() || "missing", null, false);
          }),
        })),
      };

      return {
        apps: [],
        initializeApp: jest.fn(),
        firestore: jest.fn(() => firestoreMock),
      };
    });

    jest.unmock("src/middleware/withTenant");

    const express = require("express") as typeof import("express");
    const { withTenant } = require("src/middleware/withTenant") as typeof import("src/middleware/withTenant");

    const app = express();
    app.use((req: any, _res: any, next: any) => {
      req.user = { uid: "u1" };
      next();
    });
    app.get("/t", withTenant, (_req: any, res: any) => res.json({ ok: true }));

    const res = await request(app).get("/t").set("x-tenant-id", "t1");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
