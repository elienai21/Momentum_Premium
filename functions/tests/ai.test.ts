import "./setupFirebaseMock";
import request from "supertest";
import { makeTestApp, debugIfNotOk } from "./helpers/testApp";

describe("AI Insights", () => {
  it("gera insights válidos", async () => {
    const app = makeTestApp();
    const res = await request(app).post("/api/ai/insights").send({ prompt: "Teste" });
    await debugIfNotOk(res);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.insights)).toBe(true);
  });
});
