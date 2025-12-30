import "./setupFirebaseMock";
import request from "supertest";
import { makeTestApp, debugIfNotOk } from "./helpers/testApp";

describe("Public signup", () => {
  it("cria tenant + member com status active e email", async () => {
    const app = makeTestApp();
    const res = await request(app)
      .post("/api/public/signup")
      .set("x-id-token", "test-token")
      .send({ companyName: "Acme", vertical: "finance", mode: "new" });

    await debugIfNotOk(res);
    expect(res.status).toBe(201);
    expect(res.body?.data?.tenantId).toBeTruthy();

    const { db } = require("src/services/firebase") as any;
    const tx = db.__lastTransaction;
    expect(tx).toBeTruthy();
    expect(tx.set).toHaveBeenCalled();

    const setCalls = (tx.set as jest.Mock).mock.calls;
    const memberSet = setCalls.find((c: any[]) =>
      String(c?.[0]?.__path || "").includes("/members/")
    );
    expect(memberSet).toBeTruthy();

    const memberPayload = memberSet?.[1] || {};
    expect(memberPayload.role).toBe("admin");
    expect(memberPayload.status).toBe("active");
    expect(memberPayload.email).toBeTruthy();
    expect(memberPayload.joinedAt).toBeTruthy();
  });
});
