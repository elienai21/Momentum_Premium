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
// Initialize Firebase test environment
const testEnv = firebaseFunctionsTest({
    projectId: "momentum-platform-local",
});
(0, globals_1.describe)("E2E: Auth and Tenant Creation", () => {
    const functionsBaseUrl = "http://127.0.0.1:5001/momentum-platform-local/us-central1/api";
    (0, globals_1.beforeAll)(() => {
        // Initialize admin app for direct emulator access
        admin.initializeApp({ projectId: "momentum-platform-local" });
    });
    (0, globals_1.afterAll)(() => {
        testEnv.cleanup();
    });
    // Clean up user and tenant data before each test
    (0, globals_1.beforeEach)(async () => {
        await admin.firestore().collection("tenants").get().then(snap => snap.docs.forEach(d => d.ref.delete()));
        const users = await admin.auth().listUsers();
        if (users.users.length > 0) {
            await admin.auth().deleteUsers(users.users.map(u => u.uid));
        }
    });
    (0, globals_1.it)("should create a new tenant when a new user signs up", async () => {
        console.log("TEST: Creating mock user...");
        const user = await admin.auth().createUser({
            email: "testuser@example.com",
            password: "password123",
        });
        // FIX: Cast to any to bypass type error for makeUserToken in test environment.
        const idToken = await testEnv.auth.makeUserToken(user.uid, { email: user.email });
        const signupPayload = {
            companyName: "Test Company",
            vertical: "finance",
            mode: "new",
        };
        console.log("TEST: Calling /public/signup endpoint...");
        const response = await axios_1.default.post(`${functionsBaseUrl}/public/signup`, signupPayload, {
            headers: { Authorization: `Bearer ${idToken}` },
        });
        (0, globals_1.expect)(response.status).toBe(201);
        (0, globals_1.expect)(response.data.status).toBe("success");
        const { tenantId } = response.data.data;
        (0, globals_1.expect)(tenantId).toBeDefined();
        console.log(`TEST: Verifying tenant ${tenantId} in Firestore...`);
        const tenantDoc = await admin.firestore().collection("tenants").doc(tenantId).get();
        (0, globals_1.expect)(tenantDoc.exists).toBe(true);
        const tenantData = tenantDoc.data();
        (0, globals_1.expect)(tenantData.name).toBe("Test Company");
        (0, globals_1.expect)(tenantData.ownerUid).toBe(user.uid);
        (0, globals_1.expect)(tenantData.billingStatus).toBe("trial-active");
        console.log(`TEST: Verifying member in subcollection...`);
        const memberDoc = await admin.firestore().collection("tenants").doc(tenantId).collection("members").doc(user.uid).get();
        (0, globals_1.expect)(memberDoc.exists).toBe(true);
        (0, globals_1.expect)(memberDoc.data().role).toBe("admin");
    });
});
//# sourceMappingURL=auth-tenant.test.js.map