import { db } from "./firebase";

export type Owner = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  taxId?: string;
  createdAt: string;
};

export type Building = {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  active: boolean;
  createdAt: string;
};

export type Unit = {
  id: string;
  ownerId: string;
  buildingId?: string;
  code: string;
  name?: string;
  bedrooms?: number;
  bathrooms?: number;
  nightlyRate?: number;
  active: boolean;
  createdAt: string;
};

export type Stay = {
  id: string;
  unitId: string;
  ownerId: string;
  checkIn: string; // ISO
  checkOut: string; // ISO
  nights: number;
  grossRevenue: number;
  platformFees: number;
  cleaningFees: number;
  otherCosts: number;
  netRevenue: number;
  source?: string;
  bookingId?: string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  createdAt: string;
};

export type Expense = {
  id: string;
  unitId: string;
  ownerId: string;
  category: string;
  amount: number;
  incurredAt: string; // ISO
  description?: string;
  vendor?: string;
  source?: string;
  createdAt: string;
};

export type MonthlyStatement = {
  id: string;
  ownerId: string;
  month: string; // YYYY-MM
  units: Array<{
    unitId: string;
    unitCode?: string;
    grossRevenue: number;
    cleaningFees: number;
    platformFees: number;
    otherCosts: number;
    totalExpenses: number;
    netRevenue: number;
    staysCount: number;
    nights: number;
  }>;
  totals: {
    grossRevenue: number;
    totalExpenses: number;
    netRevenue: number;
    ownerPayout: number;
  };
  ownerShareRate: number;
  generatedAt: string; // ISO
  notes?: string;
};

function ownersCol(tenantId: string) {
  return db.collection(`tenants/${tenantId}/realEstate_owners`);
}
function unitsCol(tenantId: string) {
  return db.collection(`tenants/${tenantId}/realEstate_units`);
}
function staysCol(tenantId: string) {
  return db.collection(`tenants/${tenantId}/realEstate_stays`);
}
function expensesCol(tenantId: string) {
  return db.collection(`tenants/${tenantId}/realEstate_expenses`);
}
function statementsCol(tenantId: string) {
  return db.collection(`tenants/${tenantId}/realEstate_statements`);
}
function buildingsCol(tenantId: string) {
  return db.collection(`tenants/${tenantId}/realEstate_buildings`);
}

async function findUnitByCode(
  tenantId: string,
  unitCode: string
): Promise<{ unitId: string; ownerId: string }> {
  const code = unitCode?.trim();
  if (!code) {
    throw Object.assign(new Error("Unit code is required"), { statusCode: 400 });
  }

  const unitSnap = await unitsCol(tenantId)
    .where("code", "==", code)
    .limit(1)
    .get();

  if (unitSnap.empty) {
    throw Object.assign(
      new Error(`Unit not found for code ${code}`),
      { statusCode: 404 }
    );
  }

  const unitDoc = unitSnap.docs[0];
  const unitData = unitDoc.data() as Unit;
  return { unitId: unitDoc.id, ownerId: unitData.ownerId };
}

export type StaysCsvPayload = {
  unitCode: string;
  checkIn: string;
  checkOut: string;
  nights?: number;
  grossRevenue?: number;
  platformFees?: number;
  cleaningFees?: number;
  otherCosts?: number;
  source?: string;
  bookingId?: string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  createdAt?: string;
  raw?: Record<string, any>;
};

export async function createOwner(
  tenantId: string,
  data: Omit<Owner, "id" | "createdAt">
): Promise<Owner> {
  const createdAt = new Date().toISOString();
  const doc = await ownersCol(tenantId).add({ ...data, createdAt });
  return { id: doc.id, createdAt, ...data };
}

export async function listOwners(tenantId: string): Promise<Owner[]> {
  const snap = await ownersCol(tenantId).orderBy("createdAt", "desc").get();
  return snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) }));
}

export async function createUnit(
  tenantId: string,
  data: Omit<Unit, "id" | "createdAt" | "active">
): Promise<Unit> {
  const createdAt = new Date().toISOString();
  const payload = { ...data, active: true, createdAt };
  const doc = await unitsCol(tenantId).add(payload);
  return { id: doc.id, ...payload };
}

export async function listUnits(tenantId: string): Promise<Unit[]> {
  const snap = await unitsCol(tenantId).orderBy("createdAt", "desc").get();
  return snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) }));
}

// ============================================================
// 🏢 Building CRUD
// ============================================================

export async function createBuilding(
  tenantId: string,
  data: Omit<Building, "id" | "createdAt" | "active">
): Promise<Building> {
  const createdAt = new Date().toISOString();
  const payload = { ...data, active: true, createdAt };
  const doc = await buildingsCol(tenantId).add(payload);
  return { id: doc.id, ...payload };
}

export async function listBuildings(tenantId: string): Promise<Building[]> {
  const snap = await buildingsCol(tenantId)
    .where("active", "==", true)
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) }));
}

export async function updateBuilding(
  tenantId: string,
  id: string,
  data: Partial<Omit<Building, "id" | "createdAt">>
): Promise<void> {
  await buildingsCol(tenantId).doc(id).update(data);
}

export async function archiveBuilding(
  tenantId: string,
  id: string
): Promise<void> {
  await buildingsCol(tenantId).doc(id).update({ active: false });
}

export async function registerStay(
  tenantId: string,
  data: Omit<Stay, "id" | "createdAt" | "netRevenue">
): Promise<Stay> {
  const createdAt = new Date().toISOString();
  const netRevenue =
    (data.grossRevenue || 0) -
    (data.platformFees || 0) -
    (data.cleaningFees || 0) -
    (data.otherCosts || 0);
  const payload = { ...data, createdAt, netRevenue };
  const doc = await staysCol(tenantId).add(payload);
  return { id: doc.id, ...payload };
}

export async function listStaysByUnit(
  tenantId: string,
  unitId: string
): Promise<Stay[]> {
  const snap = await staysCol(tenantId)
    .where("unitId", "==", unitId)
    .orderBy("checkIn", "desc")
    .get();
  return snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) }));
}

function calculateNights(checkIn?: string, checkOut?: string): number | undefined {
  if (!checkIn || !checkOut) return undefined;
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return undefined;
  const diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0) return undefined;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export async function registerStayFromStaysCsv(
  tenantId: string,
  payload: StaysCsvPayload
): Promise<Stay> {
  const { unitId, ownerId } = await findUnitByCode(tenantId, payload.unitCode);

  // Datas e noites
  const checkIn = payload.checkIn;
  const checkOut = payload.checkOut;
  const calculatedNights = calculateNights(checkIn, checkOut);
  const nights =
    payload.nights && payload.nights > 0
      ? payload.nights
      : calculatedNights || 0;

  // Valores financeiros com fallbacks
  const grossRevenue =
    payload.grossRevenue ??
    payload.raw?.precoVendaCorrigido ??
    payload.raw?.totalReserva ??
    0;

  const cleaningFees =
    payload.cleaningFees ?? payload.raw?.taxaLimpeza ?? 0;

  const platformFees =
    payload.platformFees ?? payload.raw?.taxasRepasse ?? 0;

  const otherCosts =
    payload.otherCosts ?? payload.raw?.taxasExtras ?? 0;

  const netRevenue =
    (grossRevenue || 0) -
    (cleaningFees || 0) -
    (platformFees || 0) -
    (otherCosts || 0);

  const createdAt =
    payload.createdAt || new Date().toISOString();

  const stayData: Omit<Stay, "id"> = {
    unitId,
    ownerId,
    checkIn,
    checkOut,
    nights,
    grossRevenue,
    platformFees,
    cleaningFees,
    otherCosts,
    netRevenue,
    source: payload.source || "Stays",
    bookingId: payload.bookingId,
    guestName: payload.guestName,
    guestEmail: payload.guestEmail,
    guestPhone: payload.guestPhone,
    createdAt,
  };

  const doc = await staysCol(tenantId).add(stayData);
  return { id: doc.id, ...stayData };
}

export async function registerExpense(
  tenantId: string,
  data: Omit<Expense, "id" | "createdAt">
): Promise<Expense> {
  const createdAt = new Date().toISOString();
  const payload = { ...data, createdAt };
  const doc = await expensesCol(tenantId).add(payload);
  return { id: doc.id, ...payload };
}

export async function listExpensesByUnit(
  tenantId: string,
  unitId: string
): Promise<Expense[]> {
  const snap = await expensesCol(tenantId)
    .where("unitId", "==", unitId)
    .orderBy("incurredAt", "desc")
    .get();
  return snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) }));
}

export type ExpensePayload = {
  unitCode: string;
  category: string;
  amount: number;
  incurredAt: string;
  description?: string;
  vendor?: string;
  source?: string;
};

export async function registerExpenseFromPayload(
  tenantId: string,
  payload: ExpensePayload
): Promise<Expense> {
  const { unitId, ownerId } = await findUnitByCode(tenantId, payload.unitCode);

  if (!payload.amount || payload.amount <= 0) {
    throw Object.assign(new Error("Amount must be greater than zero"), {
      statusCode: 400,
    });
  }
  if (!payload.category) {
    throw Object.assign(new Error("Category is required"), { statusCode: 400 });
  }
  if (!payload.incurredAt) {
    throw Object.assign(new Error("incurredAt is required"), { statusCode: 400 });
  }

  const incurredAtDate = new Date(payload.incurredAt);
  if (Number.isNaN(incurredAtDate.getTime())) {
    throw Object.assign(new Error("Invalid incurredAt date"), { statusCode: 400 });
  }

  const incurredAt = incurredAtDate.toISOString();
  const createdAt = new Date().toISOString();

  const expense: Omit<Expense, "id"> = {
    unitId,
    ownerId,
    category: payload.category,
    amount: payload.amount,
    incurredAt,
    description: payload.description,
    vendor: payload.vendor,
    source: payload.source || "OwnerForm",
    createdAt,
  };

  const doc = await expensesCol(tenantId).add(expense);
  return { id: doc.id, ...expense };
}

export async function generateMonthlyStatement(
  tenantId: string,
  ownerId: string,
  month: string
): Promise<MonthlyStatement> {
  const monthPattern = /^\d{4}-\d{2}$/;
  if (!monthPattern.test(month)) {
    throw Object.assign(new Error("Invalid month format, expected YYYY-MM"), {
      statusCode: 400,
    });
  }

  const ownerRef = ownersCol(tenantId).doc(ownerId);
  const ownerSnap = await ownerRef.get();
  if (!ownerSnap.exists) {
    throw Object.assign(new Error("Owner not found"), { statusCode: 404 });
  }
  const ownerData = ownerSnap.data() as Partial<Owner>;
  const ownerShareRate =
    typeof (ownerData as any)?.ownerShareRate === "number"
      ? Math.max(0, Math.min(1, (ownerData as any).ownerShareRate))
      : 1;

  const [year, monthNum] = month.split("-").map((v) => Number(v));
  const start = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthNum, 1, 0, 0, 0, 0));
  const startIso = start.toISOString();
  const endIso = end.toISOString();

  // Units of the owner
  const unitsSnap = await unitsCol(tenantId)
    .where("ownerId", "==", ownerId)
    .get();
  const unitsData = unitsSnap.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) })) as Unit[];
  const unitIds = unitsData.map((u) => u.id);
  const unitById = unitsData.reduce<Record<string, Unit>>((acc, u) => {
    acc[u.id] = u;
    return acc;
  }, {});

  // Stays in month
  const staysSnap = await staysCol(tenantId)
    .where("ownerId", "==", ownerId)
    .where("checkIn", ">=", startIso)
    .where("checkIn", "<", endIso)
    .get();
  const stays = staysSnap.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) })) as Stay[];

  // Expenses in month
  const expensesSnap = await expensesCol(tenantId)
    .where("ownerId", "==", ownerId)
    .where("incurredAt", ">=", startIso)
    .where("incurredAt", "<", endIso)
    .get();
  const expenses = expensesSnap.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) })) as Expense[];

  const unitsAggregated = unitIds.map((unitId) => {
    const unitStays = stays.filter((s) => s.unitId === unitId);
    const unitExpenses = expenses.filter((e) => e.unitId === unitId);

    const grossRevenue = unitStays.reduce((sum, s) => sum + (s.grossRevenue || 0), 0);
    const cleaningFees = unitStays.reduce((sum, s) => sum + (s.cleaningFees || 0), 0);
    const platformFees = unitStays.reduce((sum, s) => sum + (s.platformFees || 0), 0);
    const staysOtherCosts = unitStays.reduce((sum, s) => sum + (s.otherCosts || 0), 0);
    const expensesAmount = unitExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const otherCosts = staysOtherCosts + expensesAmount;
    const totalExpenses = cleaningFees + platformFees + otherCosts;
    const netRevenue = grossRevenue - totalExpenses;
    const staysCount = unitStays.length;
    const nights = unitStays.reduce((sum, s) => sum + (s.nights || 0), 0);

    return {
      unitId,
      unitCode: unitById[unitId]?.code,
      grossRevenue,
      cleaningFees,
      platformFees,
      otherCosts,
      totalExpenses,
      netRevenue,
      staysCount,
      nights,
    };
  });

  const totals = unitsAggregated.reduce(
    (acc, u) => {
      acc.grossRevenue += u.grossRevenue;
      acc.totalExpenses += u.totalExpenses;
      acc.netRevenue += u.netRevenue;
      return acc;
    },
    { grossRevenue: 0, totalExpenses: 0, netRevenue: 0 }
  );

  const ownerPayout = totals.netRevenue * ownerShareRate;
  const generatedAt = new Date().toISOString();

  const statement: Omit<MonthlyStatement, "id"> = {
    ownerId,
    month,
    units: unitsAggregated,
    totals: {
      ...totals,
      ownerPayout,
    },
    ownerShareRate,
    generatedAt,
  };

  const docId = `${ownerId}_${month}`;
  await statementsCol(tenantId).doc(docId).set(statement);
  return { id: docId, ...statement };
}

export async function getOrGenerateMonthlyStatement(
  tenantId: string,
  ownerId: string,
  month: string
): Promise<MonthlyStatement> {
  const docId = `${ownerId}_${month}`;
  const existing = await statementsCol(tenantId).doc(docId).get();
  if (existing.exists) {
    return { id: docId, ...(existing.data() as any) } as MonthlyStatement;
  }
  return generateMonthlyStatement(tenantId, ownerId, month);
}

// ============================================================
// 📊 Portfolio Summary & Stats
// ============================================================

export type PortfolioSummary = {
  totals: {
    activeOwners: number;
    totalUnits: number;
    activeUnits: number;
    grossRevenue: number;
    netRevenue: number;
    totalExpenses: number;
    staysCount: number;
  };
  period: {
    start: string;
    end: string;
  };
  potentialCharges?: {
    ownerFee: number;
    unitFee: number;
    total: number;
  };
};

const SUMMARY_CACHE: Record<string, { data: PortfolioSummary; expires: number }> = {};

export async function getPortfolioSummary(
  tenantId: string,
  days = 30
): Promise<PortfolioSummary> {
  const cacheKey = `${tenantId}_${days}`;
  const now = Date.now();

  if (SUMMARY_CACHE[cacheKey] && SUMMARY_CACHE[cacheKey].expires > now) {
    return SUMMARY_CACHE[cacheKey].data;
  }

  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days);

  const startIso = start.toISOString();
  const endIso = end.toISOString();

  // 1. Stats de inventário
  const ownersSnap = await ownersCol(tenantId).get();
  const unitsSnap = await unitsCol(tenantId).get();

  const activeOwnersCount = ownersSnap.size;
  const totalUnitsCount = unitsSnap.size;
  const activeUnitsCount = unitsSnap.docs.filter((d: any) => (d.data() as Unit).active).length;

  // 2. Stats financeiras (Stays & Expenses no período)
  const staysSnap = await staysCol(tenantId)
    .where("checkIn", ">=", startIso)
    .where("checkIn", "<", endIso)
    .get();

  const expensesSnap = await expensesCol(tenantId)
    .where("incurredAt", ">=", startIso)
    .where("incurredAt", "<", endIso)
    .get();

  const stays = staysSnap.docs.map((d: any) => d.data() as Stay);
  const expenses = expensesSnap.docs.map((d: any) => d.data() as Expense);

  const grossRevenue = stays.reduce((sum: number, s: Stay) => sum + (s.grossRevenue || 0), 0);
  const staysFees = stays.reduce((sum: number, s: Stay) => sum + (s.platformFees || 0) + (s.cleaningFees || 0) + (s.otherCosts || 0), 0);
  const expensesAmount = expenses.reduce((sum: number, e: Expense) => sum + (e.amount || 0), 0);

  const totalExpenses = staysFees + expensesAmount;
  const netRevenue = grossRevenue - totalExpenses;
  const staysCount = stays.length;

  // 3. Billing Preview (Estimativa simbólica)
  // R$ 10 por proprietário ativo + R$ 2 por unidade ativa
  const ownerFee = activeOwnersCount * 10;
  const unitFee = activeUnitsCount * 2;

  const summary: PortfolioSummary = {
    totals: {
      activeOwners: activeOwnersCount,
      totalUnits: totalUnitsCount,
      activeUnits: activeUnitsCount,
      grossRevenue,
      netRevenue,
      totalExpenses,
      staysCount
    },
    period: {
      start: startIso,
      end: endIso
    },
    potentialCharges: {
      ownerFee,
      unitFee,
      total: ownerFee + unitFee
    }
  };

  // Cache por 15 minutos
  SUMMARY_CACHE[cacheKey] = {
    data: summary,
    expires: now + 15 * 60 * 1000
  };

  return summary;
}
