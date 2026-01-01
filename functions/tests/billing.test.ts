import { jest, describe, it, expect } from "@jest/globals";
import "./setupFirebaseMock";
import request from "supertest";
import { makeTestApp, debugIfNotOk } from "./helpers/testApp";

jest.mock("stripe", () => {
  return jest.fn().mockImplementation(() => ({
    usageRecords: {
      create: (jest.fn() as any).mockResolvedValue({ id: "ur_123" }),
    },
  }));
});

jest.mock("src/utils/usageTracker", () => ({
  reportUsageToStripe: jest.fn(async () => Promise.resolve()),
}));

describe("Billing", () => {
  it("reporta uso com sucesso", async () => {
    const { __setDoc } = require("firebase-admin") as any;
    __setDoc("tenants/test-tenant", { billing: { subscriptionItemId: "si_123" } });

    const app = makeTestApp();
    const res = await request(app)
      .post("/api/billing/report")
      .set("x-test-tenant", "test-tenant")
      .set("x-test-uid", "tester")
      .send({ tokens: 100, subscriptionItemId: "si_123" });
    await debugIfNotOk(res);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});
