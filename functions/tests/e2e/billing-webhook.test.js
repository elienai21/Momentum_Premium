"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const admin = __importStar(require("firebase-admin"));
const firebaseFunctionsTest = __importStar(require("firebase-functions-test"));
const axios_1 = __importDefault(require("axios"));
const stripe_mock_1 = __importDefault(require("stripe-mock"));
const testEnv = firebaseFunctionsTest({ projectId: "momentum-platform-local" });
(0, globals_1.describe)("E2E: Billing and Webhooks", () => {
    const functionsBaseUrl = "http://127.0.0.1:5001/momentum-platform-local/us-central1";
    let testUser;
    let testTenantId;
    const stripe = (0, stripe_mock_1.default)();
    (0, globals_1.beforeAll)(async () => {
        admin.initializeApp({ projectId: "momentum-platform-local" });
        testUser = await admin.auth().createUser({ email: "billing@test.com" });
    });
    (0, globals_1.afterAll)(() => {
        testEnv.cleanup();
    });
    (0, globals_1.beforeEach)(async () => {
        const docRef = await admin.firestore().collection("tenants").add({
            name: "Billing Test Tenant",
            ownerUid: testUser.uid,
            planId: "starter",
            "billing.status": "trial",
        });
        testTenantId = docRef.id;
    });
    (0, globals_1.afterEach)(async () => {
        await admin.firestore().collection("tenants").doc(testTenantId).delete();
        await admin.firestore().collection("webhook_events").get().then(s => s.docs.forEach(d => d.ref.delete()));
    });
    (0, globals_1.it)("should handle the 'invoice.payment_succeeded' webhook and activate a subscription", async () => {
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
        const response = await axios_1.default.post(`${functionsBaseUrl}/stripeWebhook`, payload, {
            headers: { 'Stripe-Signature': signature, 'Content-Type': 'application/json' },
        });
        (0, globals_1.expect)(response.status).toBe(200);
        (0, globals_1.expect)(response.data.received).toBe(true);
        console.log("TEST: Verifying tenant status in Firestore...");
        const tenantDoc = await admin.firestore().collection("tenants").doc(testTenantId).get();
        const billingStatus = tenantDoc.data()?.billing?.status;
        (0, globals_1.expect)(billingStatus).toBe("active");
        const eventDoc = await admin.firestore().collection('webhook_events').doc('evt_12345').get();
        (0, globals_1.expect)(eventDoc.exists).toBe(true);
    });
});
//# sourceMappingURL=billing-webhook.test.js.map