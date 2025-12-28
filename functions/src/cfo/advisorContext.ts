import { db } from "src/services/firebase";

import * as admin from 'firebase-admin';

export async function getAdvisorContext(tenantId: string) {
  const mem = (await db.collection(`tenants/${tenantId}/ai_context`).doc('memory').get()).data() || {};
  const plan = (await db.collection(`tenants/${tenantId}/ai_context`).doc('action_plan').get()).data() || {};
  const health = (await db.collection(`tenants/${tenantId}/insights`).doc('healthScore').get()).data() || {};
  return { memory: mem, actionPlan: plan, health };
}



