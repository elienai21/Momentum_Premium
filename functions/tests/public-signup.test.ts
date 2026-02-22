import { jest, describe, it, expect } from "@jest/globals";
import "./setupFirebaseMock"; // Import this BEFORE other imports to ensure mocks are applied
import request from "supertest";
import { makeTestApp, debugIfNotOk } from "./helpers/testApp";
import { db } from "./mocks/firebase";

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

    const tx = (db as any).__lastTransaction;
    expect(tx).toBeTruthy();
    expect(tx.set).toHaveBeenCalled();

    const setCalls = (tx.set as jest.Mock).mock.calls;
    const memberSet = setCalls.find((c: any[]) => {
      const ref = c?.[0];
      const p = String(ref?.path || ref?.__path || (typeof ref === 'string' ? ref : ''));
      return p.includes("/members/");
    });

    expect(memberSet).toBeTruthy();

    if (!memberSet) throw new Error("memberSet not found");
    const memberPayload = memberSet[1] as any;
    expect(memberPayload.role).toBe("admin");
    expect(memberPayload.status).toBe("active");
    expect(memberPayload.email).toBeTruthy();
    expect(memberPayload.joinedAt).toBeTruthy();
  });
});
