import { db } from "src/services/firebase";

import { FeatureFlags } from '../types';


export interface Plan {
  id: string;
  name: string;
  maxUsers: number;
  features: FeatureFlags;
}

/**
 * Loads the full plan configuration from Firestore.
 */
export async function loadPlan(planId: string): Promise<Plan> {
  const snap = await db.collection('plans').doc(planId).get();
  const data = snap.exists ? snap.data() : {};

  return {
    id: planId,
    name: data?.name || planId,
    maxUsers: data?.maxUsers || 5, // Default to 5 users if not specified
    features: (data?.features ?? {}) as FeatureFlags
  };
}

/**
 * Loads the feature flags associated with a specific plan from Firestore.
 * @param planId The ID of the plan (e.g., 'starter', 'premium').
 * @returns A promise that resolves to the feature flags map.
 */
export async function loadPlanFlags(planId: string): Promise<FeatureFlags> {
  const plan = await loadPlan(planId);
  return plan.features;
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



