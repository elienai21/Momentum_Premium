

import { describe, beforeAll, afterAll, it, expect } from "@jest/globals";
import * as admin from "firebase-admin";
import * as fft from "firebase-functions-test";
import axios from "axios";

const testEnv = fft({ projectId: "momentum-platform-local" });

describe("E2E: Security and Access Control", () => {
  const functionsBaseUrl = "http://127.0.0.1:5001/momentum-platform-local/us-central1/api";
  let userA: admin.auth.UserRecord, userB: admin.auth.UserRecord;
  let tenantA_Id: string, tenantB_Id: string;
  let tokenA: string;

  beforeAll(async () => {
    admin.initializeApp({ projectId: "momentum-platform-local" });

    // Create users
    [userA, userB] = await Promise.all([
      admin.auth().createUser({ email: "userA@test.com" }),
      admin.auth().createUser({ email: "userB@test.com" }),
    ]);

    // Create plans and tenants in Firestore
    const starterPlanRef = admin.firestore().collection("plans").doc("starter");
    await starterPlanRef.set({ features: { support_agent: false } });

    const tenantARef = admin.firestore().collection("tenants").doc("tenant-a");
    await tenantARef.set({ name: "Tenant A", ownerUid: userA.uid, planId: "starter", vertical: 'finance' });
    tenantA_Id = tenantARef.id;

    const tenantBRef = admin.firestore().collection("tenants").doc("tenant-b");
    await tenantBRef.set({ name: "Tenant B", ownerUid: userB.uid, planId: "starter", vertical: 'finance' });
    tenantB_Id = tenantBRef.id;

    await admin.auth().setCustomUserClaims(userA.uid, { tenantId: tenantA_Id });
    // FIX: Cast to any to bypass type error for makeUserToken in test environment.
    tokenA = await (testEnv.auth as any).makeUserToken(userA.uid, { email: userA.email, tenantId: tenantA_Id });
  });

  afterAll(() => {
    testEnv.cleanup();
  });

  it("should deny access to protected routes without authentication", async () => {
    console.log("TEST: Verifying unauthenticated access is denied...");
    await expect(
      axios.get(`${functionsBaseUrl}/portal/records`, {
        headers: { "x-tenant-id": tenantA_Id, "x-goog-access-token": "mock-token" }
      })
    ).rejects.toThrow("Request failed with status code 401");
  });

  it("should enforce tenant isolation via middleware and security rules", async () => {
    console.log("TEST: Verifying tenant data isolation...");

    // This test assumes Firestore security rules are deployed to the emulator
    // which prevent cross-tenant reads.
    const addRecordResponse = await axios.post(`${functionsBaseUrl}/portal/records`, {
      description: "Legit Record", amount: 100, category: "Test", type: "Income"
    }, {
      headers: { Authorization: `Bearer ${tokenA}`, "x-goog-access-token": "mock-token" }
    });
    expect(addRecordResponse.status).toBe(201);

    const responseA = await axios.get(`${functionsBaseUrl}/portal/records`, {
      headers: { Authorization: `Bearer ${tokenA}`, "x-goog-access-token": "mock-token" }
    });
    expect(responseA.data.data.items.length).toBeGreaterThan(0);

    const responseB = await axios.get(`${functionsBaseUrl}/portal/records`, {
      headers: { Authorization: `Bearer ${tokenA}`, "x-tenant-id": tenantB_Id, "x-goog-access-token": "mock-token" }
    });
    expect(responseB.data.data.items).toEqual([]);
  });

  it("should deny access to a feature if the tenant's plan does not include it", async () => {
    console.log("TEST: Verifying feature flag enforcement...");

    await expect(
      axios.post(`${functionsBaseUrl}/support/message`, { message: "Hello" }, {
        headers: { Authorization: `Bearer ${tokenA}`, "x-goog-access-token": "mock-token" }
      })
    ).rejects.toThrow("Request failed with status code 403");
  });
});