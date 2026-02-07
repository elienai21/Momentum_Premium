"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadPlan = loadPlan;
exports.loadPlanFlags = loadPlanFlags;
exports.hasFeature = hasFeature;
const firebase_1 = require("../services/firebase");
/**
 * Loads the full plan configuration from Firestore.
 */
async function loadPlan(planId) {
    const snap = await firebase_1.db.collection('plans').doc(planId).get();
    const data = snap.exists ? snap.data() : {};
    return {
        id: planId,
        name: data?.name || planId,
        maxUsers: data?.maxUsers || 5, // Default to 5 users if not specified
        features: (data?.features ?? {})
    };
}
/**
 * Loads the feature flags associated with a specific plan from Firestore.
 * @param planId The ID of the plan (e.g., 'starter', 'premium').
 * @returns A promise that resolves to the feature flags map.
 */
async function loadPlanFlags(planId) {
    const plan = await loadPlan(planId);
    return plan.features;
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
