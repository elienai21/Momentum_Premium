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
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const admin = __importStar(require("firebase-admin"));
const firebaseFunctionsTest = __importStar(require("firebase-functions-test"));
const advisor_1 = require("../../src/ai/advisor");
const testEnv = firebaseFunctionsTest({ projectId: "momentum-platform-local" });
// FIX: Mock the correct module and function used by the application logic.
globals_1.jest.mock("../../src/utils/aiClient", () => ({
    runGemini: globals_1.jest.fn(),
}));
// Import runGemini after the mock is defined to ensure it's the mocked version.
const aiClient_1 = require("../../src/utils/aiClient");
(0, globals_1.describe)("E2E: AI Module", () => {
    let testUser;
    let testTenantId;
    (0, globals_1.beforeAll)(async () => {
        admin.initializeApp({ projectId: "momentum-platform-local" });
        testUser = await admin.auth().createUser({ email: "ai_user@test.com" });
    });
    (0, globals_1.afterAll)(() => {
        testEnv.cleanup();
    });
    (0, globals_1.beforeEach)(async () => {
        // FIX: Add explicit generic type to the mock function to resolve the type error.
        aiClient_1.runGemini.mockResolvedValue({
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
    (0, globals_1.afterEach)(async () => {
        await admin.firestore().collection("tenants").doc(testTenantId).delete();
    });
    (0, globals_1.it)("should generate advisor insights and cache the result", async () => {
        console.log("TEST: Manually running advisor logic...");
        await (0, advisor_1.runAdvisor)(testTenantId, testUser.uid);
        const cacheKey = `advisor_run_${testTenantId}_${testUser.uid}`;
        console.log(`TEST: Verifying cache entry for key ${cacheKey}...`);
        const cacheDoc = await admin.firestore().collection("ai_cache").doc(cacheKey).get();
        (0, globals_1.expect)(cacheDoc.exists).toBe(true);
        const cacheData = cacheDoc.data();
        (0, globals_1.expect)(cacheData.result.recommendations).toEqual(["Recommendation 1", "Recommendation 2"]);
    });
});
//# sourceMappingURL=ai-module.test.js.map