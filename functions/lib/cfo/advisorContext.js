"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdvisorContext = getAdvisorContext;
const firebase_1 = require("src/services/firebase");
async function getAdvisorContext(tenantId) {
    const mem = (await firebase_1.db.collection(`tenants/${tenantId}/ai_context`).doc('memory').get()).data() || {};
    const plan = (await firebase_1.db.collection(`tenants/${tenantId}/ai_context`).doc('action_plan').get()).data() || {};
    const health = (await firebase_1.db.collection(`tenants/${tenantId}/insights`).doc('healthScore').get()).data() || {};
    return { memory: mem, actionPlan: plan, health };
}
