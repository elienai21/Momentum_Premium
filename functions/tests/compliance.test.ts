import "./setupFirebaseMock";
import request from "supertest";
import { makeTestApp, debugIfNotOk } from "./helpers/testApp";

describe("Compliance", () => {
  it("registra consentimento", async () => {
    const app = makeTestApp();
    const res = await request(app).post("/api/compliance/consent").send({});
    await debugIfNotOk(res);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});
