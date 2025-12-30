"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reconcileAccounts = reconcileAccounts;
const firebase_1 = require("../services/firebase");
const genai_1 = require("@google/genai");
const logger_1 = require("../utils/logger");
const config_1 = require("../config");
const getAiClient = () => {
    const apiKey = config_1.GEMINI_API_KEY.value();
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured.");
    }
    return new genai_1.GoogleGenAI({ apiKey });
};
async function reconcileAccounts(tenantId, transactionsText) {
    const ai = getAiClient();
    // 1. Fetch pending accounts from Firestore
    const accountsSnap = await firebase_1.db.collection(`tenants/${tenantId}/accounts`)
        .where("status", "in", ["pending", "overdue"])
        .get();
    if (accountsSnap.empty) {
        return { message: "No pending accounts to reconcile.", matches: [], updatedCount: 0 };
    }
    const pendingAccounts = accountsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    // 2. Build the prompt for Gemini
    const prompt = `
    You are an intelligent financial reconciliation assistant.
    Your task is to compare a list of bank statement transactions with a list of pending accounts from our system.
    For each bank transaction that confidently matches a pending account in amount and has a compatible date, provide a match.
    A date is compatible if it's on or very close to the account's due date.

    Bank Statement Transactions:
    ---
    ${transactionsText}
    ---

    Pending System Accounts:
    ---
    ${JSON.stringify(pendingAccounts.map((a) => ({ id: a.id, description: a.description, amount: a.amount, dueDate: a.dueDate })), null, 2)}
    ---

    Return a valid JSON array of matches with the following structure. Do not include matches with low confidence (below 0.8).
    [
      { "accountId": "string", "matchConfidence": "number between 0.8 and 1.0", "amount": "number", "date": "string from statement" }
    ]
  `;
    // 3. Call Gemini API
    const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: prompt,
        config: { responseMimeType: "application/json" },
    });
    const rawJson = response.text;
    if (!rawJson) {
        logger_1.logger.error("AI reconciliation returned no text", { tenantId });
        throw new Error("AI response was empty.");
    }
    const matches = JSON.parse(rawJson.trim());
    // 4. Update Firestore for high-confidence matches
    const batch = firebase_1.db.batch();
    let updatedCount = 0;
    for (const match of matches) {
        if (match.matchConfidence >= 0.8) {
            const ref = firebase_1.db.doc(`tenants/${tenantId}/accounts/${match.accountId}`);
            batch.update(ref, { status: "paid", reconciledAt: new Date().toISOString() });
            updatedCount++;
        }
    }
    await batch.commit();
    logger_1.logger.info(`AI reconciliation completed for tenant ${tenantId}. Found ${matches.length} potential matches, updated ${updatedCount}.`);
    return { matches, updatedCount };
}
