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
const testEnv = firebaseFunctionsTest({ projectId: "momentum-platform-local" });
(0, globals_1.describe)("E2E: Security and Access Control", () => {
    const functionsBaseUrl = "http://127.0.0.1:5001/momentum-platform-local/us-central1/api";
    let userA, userB;
    let tenantA_Id, tenantB_Id;
    let tokenA;
    (0, globals_1.beforeAll)(async () => {
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
        tokenA = await testEnv.auth.makeUserToken(userA.uid, { email: userA.email, tenantId: tenantA_Id });
    });
    (0, globals_1.afterAll)(() => {
        testEnv.cleanup();
    });
    (0, globals_1.it)("should deny access to protected routes without authentication", async () => {
        console.log("TEST: Verifying unauthenticated access is denied...");
        await (0, globals_1.expect)(axios_1.default.get(`${functionsBaseUrl}/portal/records`, {
            headers: { "x-tenant-id": tenantA_Id, "x-goog-access-token": "mock-token" }
        })).rejects.toThrow("Request failed with status code 401");
    });
    (0, globals_1.it)("should enforce tenant isolation via middleware and security rules", async () => {
        console.log("TEST: Verifying tenant data isolation...");
        // This test assumes Firestore security rules are deployed to the emulator
        // which prevent cross-tenant reads.
        const addRecordResponse = await axios_1.default.post(`${functionsBaseUrl}/portal/records`, {
            description: "Legit Record", amount: 100, category: "Test", type: "Income"
        }, {
            headers: { Authorization: `Bearer ${tokenA}`, "x-goog-access-token": "mock-token" }
        });
        (0, globals_1.expect)(addRecordResponse.status).toBe(201);
        const responseA = await axios_1.default.get(`${functionsBaseUrl}/portal/records`, {
            headers: { Authorization: `Bearer ${tokenA}`, "x-goog-access-token": "mock-token" }
        });
        (0, globals_1.expect)(responseA.data.data.items.length).toBeGreaterThan(0);
        const responseB = await axios_1.default.get(`${functionsBaseUrl}/portal/records`, {
            headers: { Authorization: `Bearer ${tokenA}`, "x-tenant-id": tenantB_Id, "x-goog-access-token": "mock-token" }
        });
        (0, globals_1.expect)(responseB.data.data.items).toEqual([]);
    });
    (0, globals_1.it)("should deny access to a feature if the tenant's plan does not include it", async () => {
        console.log("TEST: Verifying feature flag enforcement...");
        await (0, globals_1.expect)(axios_1.default.post(`${functionsBaseUrl}/support/message`, { message: "Hello" }, {
            headers: { Authorization: `Bearer ${tokenA}`, "x-goog-access-token": "mock-token" }
        })).rejects.toThrow("Request failed with status code 403");
    });
});
//# sourceMappingURL=security-access.test.js.map