
import { describe, beforeAll, afterAll, beforeEach, afterEach, it, expect } from "@jest/globals";
import * as admin from "firebase-admin";
import * as firebaseFunctionsTest from "firebase-functions-test";
import axios from "axios";
import stripeMock from "stripe-mock";

const testEnv = firebaseFunctionsTest({ projectId: "momentum-platform-local" });

describe("E2E: Billing and Webhooks", () => {
  const functionsBaseUrl = "http://127.0.0.1:5001/momentum-platform-local/us-central1";
  let testUser: admin.auth.UserRecord;
  let testTenantId: string;
  const stripe = stripeMock();

  beforeAll(async () => {
    admin.initializeApp({ projectId: "momentum-platform-local" });
    testUser = await admin.auth().createUser({ email: "billing@test.com" });
  });

  afterAll(() => {
    testEnv.cleanup();
  });

  beforeEach(async () => {
    const docRef = await admin.firestore().collection("tenants").add({
      name: "Billing Test Tenant",
      ownerUid: testUser.uid,
      planId: "starter",
      "billing.status": "trial",
    });
    testTenantId = docRef.id;
  });
  
  afterEach(async () => {
    await admin.firestore().collection("tenants").doc(testTenantId).delete();
    await admin.firestore().collection("webhook_events").get().then(s => s.docs.forEach(d => d.ref.delete()));
  });

  it("should handle the 'invoice.payment_succeeded' webhook and activate a subscription", async () => {
    console.log("TEST: Simulating Stripe webhook for successful payment...");
    
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const mockInvoice = {
        id: 'in_12345',
        object: 'invoice',
        subscription: 'sub_12345',
        metadata: { tenantId: testTenantId },
    };

    const payload = JSON.stringify({
      id: 'evt_12345',
      object: 'event',
      type: 'invoice.payment_succeeded',
      data: { object: mockInvoice },
    }, null, 2);

    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: webhookSecret,
    });
    
    const response = await axios.post(`${functionsBaseUrl}/stripeWebhook`, payload, {
      headers: { 'Stripe-Signature': signature, 'Content-Type': 'application/json' },
    });

    expect(response.status).toBe(200);
    expect(response.data.received).toBe(true);

    console.log("TEST: Verifying tenant status in Firestore...");
    const tenantDoc = await admin.firestore().collection("tenants").doc(testTenantId).get();
    const billingStatus = tenantDoc.data()?.billing?.status;
    expect(billingStatus).toBe("active");

    const eventDoc = await admin.firestore().collection('webhook_events').doc('evt_12345').get();
    expect(eventDoc.exists).toBe(true);
  });
});
