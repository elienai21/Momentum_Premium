import { db } from "src/services/firebase";



export async function getHealthSeries(tenantId: string, days = 30) {
  const since = new Date(); since.setDate(since.getDate() - days);
  const snap = await db
    .collection(`tenants/${tenantId}/health_history`)
    .where("date", ">=", since.toISOString().slice(0, 10))
    .orderBy("date", "asc")
    .get();
  return snap.docs.map((d: FirebaseFirestore.QueryDocumentSnapshot) => d.data());
}



