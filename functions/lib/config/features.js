"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadPlanFlags = loadPlanFlags;
exports.hasFeature = hasFeature;
const firebase_1 = require("../services/firebase");
/**
 * Loads the feature flags associated with a specific plan from Firestore.
 * @param planId The ID of the plan (e.g., 'starter', 'premium').
 * @returns A promise that resolves to the feature flags map.
 */
async function loadPlanFlags(planId) {
    const snap = await firebase_1.db.collection('plans').doc(planId).get();
    const data = snap.exists ? snap.data() : { features: {} };
    return (data?.features ?? {});
}
/**
 * Checks if a specific feature is enabled in the provided flags.
 * @param flags The feature flags object.
 * @param key The feature key to check.
 * @returns True if the feature is enabled, false otherwise.
 */
function hasFeature(flags, key) {
    return !!flags[key];
}
