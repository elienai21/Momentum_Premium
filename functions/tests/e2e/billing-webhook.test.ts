
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
    // Clean up stripe_events (new collection)
    await admin.firestore().collection("stripe_events").get().then(s => s.docs.forEach(d => d.ref.delete()));
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

    // Verify stripe_events collection (instead of webhook_events)
    const eventDoc = await admin.firestore().collection('stripe_events').doc('evt_12345').get();
    expect(eventDoc.exists).toBe(true);
    expect(eventDoc.data()?.status).toBe("received");
  });

  it("should return idempotent response for sequential duplicate events", async () => {
    console.log("TEST: Testing sequential duplicate idempotency...");

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const payload = JSON.stringify({
      id: 'evt_duplicate_seq',
      object: 'event',
      type: 'invoice.payment_succeeded',
      data: { object: { id: 'in_seq', metadata: { tenantId: testTenantId } } },
    }, null, 2);

    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: webhookSecret,
    });

    // First request
    const response1 = await axios.post(`${functionsBaseUrl}/stripeWebhook`, payload, {
      headers: { 'Stripe-Signature': signature, 'Content-Type': 'application/json' },
    });
    expect(response1.status).toBe(200);
    expect(response1.data.idempotent).toBeUndefined(); // First request, not idempotent

    // Second request (duplicate)
    const response2 = await axios.post(`${functionsBaseUrl}/stripeWebhook`, payload, {
      headers: { 'Stripe-Signature': signature, 'Content-Type': 'application/json' },
    });
    expect(response2.status).toBe(200);
    expect(response2.data.idempotent).toBe(true); // Should be marked as idempotent
  });

  it("should handle concurrent duplicate events without race condition", async () => {
    console.log("TEST: Testing concurrent duplicate idempotency...");

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const payload = JSON.stringify({
      id: 'evt_duplicate_concurrent',
      object: 'event',
      type: 'invoice.payment_succeeded',
      data: { object: { id: 'in_conc', metadata: { tenantId: testTenantId } } },
    }, null, 2);

    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: webhookSecret,
    });

    // Send 3 concurrent requests
    const requests = Array(3).fill(null).map(() =>
      axios.post(`${functionsBaseUrl}/stripeWebhook`, payload, {
        headers: { 'Stripe-Signature': signature, 'Content-Type': 'application/json' },
      }).catch(e => e.response)
    );

    const responses = await Promise.all(requests);

    // All should return 200
    responses.forEach(r => expect(r.status).toBe(200));

    // Exactly one should be non-idempotent (first), others should be idempotent
    const nonIdempotent = responses.filter(r => !r.data.idempotent);
    const idempotent = responses.filter(r => r.data.idempotent === true);

    expect(nonIdempotent.length).toBe(1);
    expect(idempotent.length).toBe(2);

    // Verify only one event document exists
    const events = await admin.firestore()
      .collection('stripe_events')
      .where('eventId', '==', 'evt_duplicate_concurrent')
      .get();
    expect(events.size).toBe(1);
  });
});
