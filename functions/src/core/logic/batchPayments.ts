import { db } from "src/services/firebase";



const getCollection = (tenantId: string) => db.collection(`tenants/${tenantId}/transactions`);

export async function getPendingPayments(tenantId: string) {
  const today = new Date().toISOString().split("T")[0];
  const snap = await getCollection(tenantId)
    .where("status", "==", "pending")
    .where("dateOfPayment", "<=", today)
    .orderBy("dateOfPayment")
    .get();
  return snap.docs.map((d: FirebaseFirestore.QueryDocumentSnapshot) => ({ id: d.id, ...d.data() }));
}

export async function confirmPayments(tenantId: string, ids: string[]) {
  const batch = db.batch();
  ids.forEach((id) => {
    const ref = getCollection(tenantId).doc(id);
    batch.update(ref, { status: "confirmed", confirmedAt: new Date().toISOString() });
  });
  await batch.commit();
  return { ok: true, count: ids.length };
}



