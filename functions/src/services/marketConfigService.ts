// functions/src/services/marketConfigService.ts
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

export type Horizon = "30d" | "90d";

export type MarketConfig = {
  enabled: boolean;
  sector: string;
  region: string;
  companySize: string;
  horizon?: Horizon;
  updatedAt: FirebaseFirestore.Timestamp;
  updatedBy: string;
};

const DEFAULT_CONFIG = (uid = ""): MarketConfig => ({
  enabled: true,
  sector: "",
  region: "",
  companySize: "",
  horizon: "90d",
  updatedAt: admin.firestore.Timestamp.now(),
  updatedBy: uid,
});

function marketDocRef(tenantId: string) {
  // /tenants/{tenantId}/settings/market
  return db
    .collection("tenants")
    .doc(tenantId)
    .collection("settings")
    .doc("market");
}

/**
 * Retorna a MarketConfig do tenant.
 * Se não existir, retorna um default seguro (não grava).
 */
export async function getMarketConfig(tenantId: string): Promise<MarketConfig> {
  const ref = marketDocRef(tenantId);
  const snap = await ref.get();

  if (!snap.exists) {
    // default sem gravar – o PUT fará o primeiro persist
    return DEFAULT_CONFIG("");
  }

  const data = snap.data() || {};
  return {
    enabled: data.enabled ?? true,
    sector: data.sector ?? "",
    region: data.region ?? "",
    companySize: data.companySize ?? "",
    horizon: (data.horizon as Horizon) ?? "90d",
    updatedAt: (data.updatedAt as FirebaseFirestore.Timestamp) ?? admin.firestore.Timestamp.now(),
    updatedBy: (data.updatedBy as string) ?? "",
  };
}

/**
 * Cria/atualiza a MarketConfig do tenant.
 * Carimba updatedAt/updatedBy no servidor.
 */
export async function upsertMarketConfig(
  tenantId: string,
  payload: Omit<MarketConfig, "updatedAt" | "updatedBy">,
  meta: { uid: string }
): Promise<MarketConfig> {
  const uid = meta?.uid || "";
  const ref = marketDocRef(tenantId);

  const data: MarketConfig = {
    enabled: payload.enabled ?? true,
    sector: (payload.sector || "").trim(),
    region: (payload.region || "").trim(),
    companySize: (payload.companySize || "").trim(),
    horizon: payload.horizon ?? "90d",
    updatedAt: admin.firestore.Timestamp.now(),
    updatedBy: uid,
  };

  await ref.set(data, { merge: true });
  return data;
}


/**
 * Tries to fetch aggregated benchmarks from 'industry_benchmarks' collection.
 * This collection should be updated by a scheduled job (e.g., nightly).
 */
async function aggregateSectorData(industry: string): Promise<any> {
  try {
    const doc = await db.collection("industry_benchmarks").doc(industry).get();
    if (doc.exists) {
      return doc.data();
    }
  } catch (error) {
    console.warn("Failed to fetch industry benchmarks", error);
  }
  return null;
}
export async function getBenchmarks(industry: string): Promise<any> {
  const normalizedIndustry = industry.toLowerCase()
    .replace(/\s+/g, "_")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Remove accents

  // Real aggregation from pre-computed collection
  const realData = await aggregateSectorData(normalizedIndustry);
  if (realData) return realData;

  // Fallback: Dados estáticos (Cold Start)
  // Import dinâmico ou require para evitar lock de tsconfig se resolveJsonModule falhar
  try {
    const benchmarks = require("../config/industryBenchmarks.json");
    const sectorData = benchmarks[normalizedIndustry] || benchmarks["small_business"];
    return sectorData;
  } catch (error) {
    console.warn("Failed to load benchmarks config", error);
    return {
      vacancy_rate: 0,
      profit_margin: 0.1,
      cac: 0,
      churn_rate: 0
    };
  }
}
