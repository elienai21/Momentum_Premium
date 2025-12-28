// web/src/services/realEstateApi.ts
import {
  collection,
  getDocs,
  query,
  where,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";

export interface RealEstatePayoutDoc {
  id: string;
  month: string;          // "2025-12"
  unitCode: string;       // ex: "Brera Moema 123"
  ownerId?: string;
  ownerName?: string;
  grossRevenue: number;
  platformFees: number;
  cleaningFees: number;
  otherCosts: number;
  ownerPayout: number;
  vivarePayout: number;   // quanto fica pra Vivare
}

export interface RealEstateSummary {
  totalGrossRevenue: number;
  totalPlatformFees: number;
  totalCleaningFees: number;
  totalOtherCosts: number;
  totalOwnerPayout: number;
  totalVivarePayout: number;
  vivareMarginPerc: number | null;
}

export interface RealEstatePayoutsResult {
  items: RealEstatePayoutDoc[];
  summary: RealEstateSummary;
}

function num(v: any): number {
  if (typeof v === "number") return v;
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function parseDoc(doc: QueryDocumentSnapshot): RealEstatePayoutDoc {
  const data = doc.data() as any;

  return {
    id: doc.id,
    month: data.month || "",
    unitCode: data.unitCode || data.unit || "Unidade",
    ownerId: data.ownerId,
    ownerName: data.ownerName,
    grossRevenue: num(data.grossRevenue),
    platformFees: num(data.platformFees),
    cleaningFees: num(data.cleaningFees),
    otherCosts: num(data.otherCosts),
    ownerPayout: num(data.ownerPayout),
    vivarePayout: num(data.realEstatePayouts ?? data.vivarePayout),
  };
}

/**
 * Lê os docs de payouts de locação por unidade/ proprietário.
 *
 * Coleção esperada: tenants/{tenantId}/realEstatePayouts
 * Se você criou com OUTRO nome, troque aqui:
 *   const colRef = collection(db, "tenants", tenantId, "NOME_DA_COLECAO");
 */
export async function getRealEstatePayouts(params: {
  tenantId: string;
  month?: string;          // "2025-12" → se não vier, traz todos
}): Promise<RealEstatePayoutsResult> {
  const { tenantId, month } = params;

  const colRef = collection(db, "tenants", tenantId, "realEstatePayouts");
  const q = month ? query(colRef, where("month", "==", month)) : colRef;

  const snap = await getDocs(q);

  const items: RealEstatePayoutDoc[] = [];
  snap.forEach((doc) => items.push(parseDoc(doc)));

  // Agregados
  let totalGrossRevenue = 0;
  let totalPlatformFees = 0;
  let totalCleaningFees = 0;
  let totalOtherCosts = 0;
  let totalOwnerPayout = 0;
  let totalVivarePayout = 0;

  for (const it of items) {
    totalGrossRevenue += it.grossRevenue;
    totalPlatformFees += it.platformFees;
    totalCleaningFees += it.cleaningFees;
    totalOtherCosts += it.otherCosts;
    totalOwnerPayout += it.ownerPayout;
    totalVivarePayout += it.vivarePayout;
  }

  const vivareMarginPerc =
    totalGrossRevenue > 0 ? totalVivarePayout / totalGrossRevenue : null;

  return {
    items,
    summary: {
      totalGrossRevenue,
      totalPlatformFees,
      totalCleaningFees,
      totalOtherCosts,
      totalOwnerPayout,
      totalVivarePayout,
      vivareMarginPerc,
    },
  };
}
