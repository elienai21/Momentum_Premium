import { db } from "src/services/firebase";

import { FeatureFlags } from '../types';

/**
 * Loads the feature flags associated with a specific plan from Firestore.
 * @param planId The ID of the plan (e.g., 'starter', 'premium').
 * @returns A promise that resolves to the feature flags map.
 */
export async function loadPlanFlags(planId: string): Promise<FeatureFlags> {
  const snap = await db.collection('plans').doc(planId).get();
  const data = snap.exists ? snap.data() : { features: {} };
  return (data?.features ?? {}) as FeatureFlags;
}

/**
 * Checks if a specific feature is enabled in the provided flags.
 * @param flags The feature flags object.
 * @param key The feature key to check.
 * @returns True if the feature is enabled, false otherwise.
 */
export function hasFeature(flags: FeatureFlags, key: string): boolean {
  return !!flags[key];
}



