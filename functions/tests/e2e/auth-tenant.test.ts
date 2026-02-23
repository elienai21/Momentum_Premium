

import { describe, beforeAll, afterAll, beforeEach, it, expect } from "@jest/globals";
import * as admin from "firebase-admin";
import fft = require("firebase-functions-test");
import axios from "axios";

// Initialize Firebase test environment
const testEnv = fft({
  projectId: "momentum-platform-local",
});

describe("E2E: Auth and Tenant Creation", () => {
  const functionsBaseUrl = "http://127.0.0.1:5001/momentum-platform-local/us-central1/api";

  beforeAll(() => {
    // Initialize admin app for direct emulator access
    admin.initializeApp({ projectId: "momentum-platform-local" });
  });

  afterAll(() => {
    testEnv.cleanup();
  });

  // Clean up user and tenant data before each test
  beforeEach(async () => {
    await admin.firestore().collection("tenants").get().then(snap => snap.docs.forEach(d => d.ref.delete()));
    const users = await admin.auth().listUsers();
    if (users.users.length > 0) {
      await admin.auth().deleteUsers(users.users.map(u => u.uid));
    }
  });

  it("should create a new tenant when a new user signs up", async () => {
    console.log("TEST: Creating mock user...");
    const user = await admin.auth().createUser({
      email: "testuser@example.com",
      password: "password123",
    });

    // FIX: Cast to any to bypass type error for makeUserToken in test environment.
    const idToken = await (testEnv.auth as any).makeUserToken(user.uid, { email: user.email });

    const signupPayload = {
      companyName: "Test Company",
      vertical: "finance",
      mode: "new",
    };

    console.log("TEST: Calling /public/signup endpoint...");
    const response = await axios.post(`${functionsBaseUrl}/public/signup`, signupPayload, {
      headers: { Authorization: `Bearer ${idToken}` },
    });

    expect(response.status).toBe(201);
    expect(response.data.status).toBe("success");
    const { tenantId } = response.data.data;
    expect(tenantId).toBeDefined();

    console.log(`TEST: Verifying tenant ${tenantId} in Firestore...`);
    const tenantDoc = await admin.firestore().collection("tenants").doc(tenantId).get();
    expect(tenantDoc.exists).toBe(true);
    const tenantData = tenantDoc.data();
    expect(tenantData?.name).toBe("Test Company");
    expect(tenantData?.ownerUid).toBe(user.uid);
    expect(tenantData?.billingStatus).toBe("trial-active");

    console.log(`TEST: Verifying member in subcollection...`);
    const memberDoc = await admin.firestore().collection("tenants").doc(tenantId).collection("members").doc(user.uid).get();
    expect(memberDoc.exists).toBe(true);
    expect(memberDoc.data()?.role).toBe("admin");
  });
});