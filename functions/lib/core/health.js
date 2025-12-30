"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHealthSeries = getHealthSeries;
const firebase_1 = require("src/services/firebase");
async function getHealthSeries(tenantId, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const snap = await firebase_1.db
        .collection(`tenants/${tenantId}/health_history`)
        .where("date", ">=", since.toISOString().slice(0, 10))
        .orderBy("date", "asc")
        .get();
    return snap.docs.map((d) => d.data());
}
