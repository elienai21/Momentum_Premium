
import { describe, beforeAll, afterAll, beforeEach, afterEach, it, expect, jest } from "@jest/globals";
// Switch to default import for firebase-admin compatibility
import admin from "firebase-admin";
import type { UserRecord } from "firebase-admin/auth";
import * as firebaseFunctionsTest from "firebase-functions-test";
import { runAdvisor } from "../../src/ai/advisor";
import type { AiResult } from "../../src/utils/aiClient";

const testEnv = firebaseFunctionsTest({ projectId: "momentum-platform-local" }, "key.json");

jest.mock("../../src/utils/aiClient", () => ({
  aiClient: jest.fn(), // Mock the exported function name 'aiClient' directly if runGemini is alias
  runGemini: jest.fn(),
}));

import { aiClient } from "../../src/utils/aiClient";

describe("E2E: AI Module", () => {
  let testUser: UserRecord;
  let testTenantId: string;

  beforeAll(async () => {
    // admin.initializeApp handled by testEnv or globally? 
    // If global mock is replacing it, this might be redundant but safe.
    try { (admin as any).initializeApp(); } catch (e) { }
    testUser = await (admin as any).auth().createUser({ email: "ai_user@test.com", uid: "ai_user_test" });
  });

  afterAll(() => {
    testEnv.cleanup();
  });

  beforeEach(async () => {
    (aiClient as unknown as jest.Mock).mockResolvedValue({
      text: "Recommendation 1\nRecommendation 2",
      usage: { totalTokenCount: 10 },
    } as AiResult);

    const docRef = await (admin as any).firestore().collection("tenants").add({
      name: "AI Test Tenant",
      ownerUid: testUser.uid,
      planId: "premium",
      billingStatus: "active",
    });
    testTenantId = docRef.id;

    // Cleanup conversations if needed
  });

  afterEach(async () => {
    if (testTenantId) await (admin as any).firestore().collection("tenants").doc(testTenantId).delete();
  });

  it("should generate advisor insights and store conversation", async () => {
    console.log("TEST: Manually running advisor logic...");

    const req = {
      user: { uid: testUser.uid },
      tenant: { info: { id: testTenantId, plan: "premium" } },
      body: { message: "Analyze my finances" },
      traceId: "test-trace",
      header: jest.fn().mockReturnValue("req-idempotency-key"),
    } as any;

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;

    await runAdvisor(req, res);

    expect(aiClient).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));

    console.log(`TEST: Verifying conversation entry...`);

    const convs = await (admin as any).firestore().collection("ai_conversations")
      .where("tenantId", "==", testTenantId)
      .get();

    expect(convs.empty).toBe(false);
    const data = convs.docs[0].data();
    expect(data.response).toContain("Recommendation 1");
  });
});