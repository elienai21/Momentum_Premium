




import { describe, beforeAll, afterAll, beforeEach, afterEach, it, expect, jest } from "@jest/globals";
import * as admin from "firebase-admin";
import * as firebaseFunctionsTest from "firebase-functions-test";
import { runAdvisor } from "../../src/ai/advisor";
// FIX: Import the GeminiResult type for use in the mock.
import type { GeminiResult } from "../../src/utils/aiClient";

const testEnv = firebaseFunctionsTest({ projectId: "momentum-platform-local" });

// FIX: Mock the correct module and function used by the application logic.
jest.mock("../../src/utils/aiClient", () => ({
  runGemini: jest.fn(),
}));

// Import runGemini after the mock is defined to ensure it's the mocked version.
import { runGemini } from "../../src/utils/aiClient";

describe("E2E: AI Module", () => {
  let testUser: admin.auth.UserRecord;
  let testTenantId: string;

  beforeAll(async () => {
    admin.initializeApp({ projectId: "momentum-platform-local" });
    testUser = await admin.auth().createUser({ email: "ai_user@test.com" });
  });

  afterAll(() => {
    testEnv.cleanup();
  });

  beforeEach(async () => {
    // FIX: Add explicit generic type to the mock function to resolve the type error.
    (runGemini as jest.Mock<() => Promise<GeminiResult>>).mockResolvedValue({
      text: "Recommendation 1\nRecommendation 2",
      functionCalls: null,
    });

    const docRef = await admin.firestore().collection("tenants").add({
      name: "AI Test Tenant",
      ownerUid: testUser.uid,
      planId: "premium",
      billingStatus: "active",
    });
    testTenantId = docRef.id;
    
    await admin.firestore().collection("ai_cache").get().then(s => s.docs.forEach(d => d.ref.delete()));
  });
  
  afterEach(async () => {
    await admin.firestore().collection("tenants").doc(testTenantId).delete();
  });

  it("should generate advisor insights and cache the result", async () => {
    console.log("TEST: Manually running advisor logic...");

    await runAdvisor(testTenantId, testUser.uid);
    
    const cacheKey = `advisor_run_${testTenantId}_${testUser.uid}`;
    console.log(`TEST: Verifying cache entry for key ${cacheKey}...`);

    const cacheDoc = await admin.firestore().collection("ai_cache").doc(cacheKey).get();
    expect(cacheDoc.exists).toBe(true);
    const cacheData = cacheDoc.data();
    expect(cacheData.result.recommendations).toEqual(["Recommendation 1", "Recommendation 2"]);
  });
});