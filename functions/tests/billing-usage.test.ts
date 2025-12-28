import "./setupFirebaseMock";
jest.mock("src/utils/usageTracker", () => ({
  reportUsageToStripe: jest.fn(async () => Promise.resolve()),
}));

import request from "supertest";
import { makeTestApp } from "./helpers/testApp";
import { __mockCollectionGet } from "./helpers/firebaseMock";
import { reportUsageToStripe } from "src/utils/usageTracker";

describe("Billing usage endpoints", () => {
  it("GET /api/billing/usage retorna últimos logs", async () => {
    __mockCollectionGet.mockResolvedValueOnce({
      docs: [
        { data: () => ({ tenantId: "default", provider: "openai", tokens: 1000, createdAt: "2025-10-20T10:00:00Z" }) },
        { data: () => ({ tenantId: "default", provider: "gemini", tokens: 500, createdAt: "2025-10-21T11:00:00Z" }) },
      ],
      empty: false,
    });
    const app = makeTestApp();
    const res = await request(app).get("/api/billing/usage");
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
    expect(res.body[0].provider).toBeDefined();
  });

  it("POST /api/billing/report incrementa uso no Stripe", async () => {
    const app = makeTestApp();
    const res = await request(app)
      .post("/api/billing/report")
      .send({ subscriptionItemId: "si_123", amountCents: 2700 });
    if (res.status !== 200) {
      // eslint-disable-next-line no-console
      console.log("[TEST_DEBUG] billing/report", res.status, res.body, res.text);
    }

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(reportUsageToStripe).toHaveBeenCalledWith("si_123", 2700);
  });
});
