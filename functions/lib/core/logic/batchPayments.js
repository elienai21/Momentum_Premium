"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPendingPayments = getPendingPayments;
exports.confirmPayments = confirmPayments;
const firebase_1 = require("src/services/firebase");
const getCollection = (tenantId) => firebase_1.db.collection(`tenants/${tenantId}/transactions`);
async function getPendingPayments(tenantId) {
    const today = new Date().toISOString().split("T")[0];
    const snap = await getCollection(tenantId)
        .where("status", "==", "pending")
        .where("dateOfPayment", "<=", today)
        .orderBy("dateOfPayment")
        .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
async function confirmPayments(tenantId, ids) {
    const batch = firebase_1.db.batch();
    ids.forEach((id) => {
        const ref = getCollection(tenantId).doc(id);
        batch.update(ref, { status: "confirmed", confirmedAt: new Date().toISOString() });
    });
    await batch.commit();
    return { ok: true, count: ids.length };
}
