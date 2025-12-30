import { db } from "./firebase";
import { storage } from "./firebase";
import { firestore } from "firebase-admin";
import {
  documentCommitSchema,
  documentInitUploadSchema,
  documentListQuerySchema,
  RealEstateDocument,
  OwnerStatement,
} from "../types/realEstate";
import { generateStatementSchema } from "../types/realEstate";

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

export type Contract = {
  id: string;
  unitId: string;
  tenantName: string;
  startDate: string;
  endDate: string;
  rentAmount: number;
  readjustmentIndex?: string;
  createdAt: string;
  updatedAt: string;
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
function contractsCol(tenantId: string) {
  return db.collection(`tenants/${tenantId}/realEstate_contracts`);
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
function transactionsCol(tenantId: string) {
  return db.collection(`tenants/${tenantId}/transactions`);
}
function documentsCol(tenantId: string) {
  return db.collection(`tenants/${tenantId}/documents`);
}
function uploadSessionsCol(tenantId: string) {
  return db.collection(`tenants/${tenantId}/documentUploads`);
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

// ============================
// Documents (GED)
// ============================

type AuthContext = { uid: string; email?: string | null };

export async function initDocumentUpload(
  tenantId: string,
  payload: unknown,
  user: AuthContext
): Promise<{ uploadSessionId: string; uploadUrl: string; storagePath: string }> {
  const data = documentInitUploadSchema.parse(payload);
  const safeFileName = data.fileName.replace(/[^\w.\-]/g, "_");
  const storagePath = `tenants/${tenantId}/docs/${data.linkedEntityType}/${data.linkedEntityId}/${Date.now()}-${safeFileName}`;

  const sessionRef = await uploadSessionsCol(tenantId).add({
    ...data,
    storagePath,
    createdAt: new Date().toISOString(),
    createdBy: user.uid,
  });

  const bucket = storage.bucket();
  const file = bucket.file(storagePath);
  const [uploadUrl] = await file.getSignedUrl({
    version: "v4",
    action: "write",
    expires: Date.now() + 15 * 60 * 1000,
    contentType: data.mimeType,
  });

  return { uploadSessionId: sessionRef.id, uploadUrl, storagePath };
}

export async function commitDocument(
  tenantId: string,
  payload: unknown,
  user: AuthContext
): Promise<RealEstateDocument> {
  const data = documentCommitSchema.parse(payload);

  const expectedPrefix = `tenants/${tenantId}/docs/${data.linkedEntityType}/${data.linkedEntityId}/`;
  if (!data.storagePath.startsWith(expectedPrefix)) {
    throw Object.assign(new Error("invalid_storage_path"), { statusCode: 400 });
  }

  const sessionRef = uploadSessionsCol(tenantId).doc(data.uploadSessionId);
  const sessionSnap = await sessionRef.get();
  if (!sessionSnap.exists) {
    throw Object.assign(new Error("upload_session_not_found"), { statusCode: 404 });
  }

  const session = sessionSnap.data() as any;
  if (session.createdBy !== user.uid || session.storagePath !== data.storagePath) {
    throw Object.assign(new Error("upload_session_mismatch"), { statusCode: 403 });
  }

  const versionKey = `${data.linkedEntityType}:${data.linkedEntityId}:${data.docType}`;
  const now = new Date().toISOString();

  const newDoc = await db.runTransaction(async (tx: firestore.Transaction) => {
    const activeQuery = await tx.get(
      documentsCol(tenantId)
        .where("versionKey", "==", versionKey)
        .where("status", "==", "active")
        .limit(1)
    );

    let nextVersion = 1;
    if (!activeQuery.empty) {
      const activeDoc = activeQuery.docs[0];
      const current = activeDoc.data() as RealEstateDocument;
      nextVersion = (current.version || 1) + 1;
      tx.update(activeDoc.ref, {
        status: "archived",
        updatedAt: now,
        updatedBy: user.uid,
      });
    }

    const docRef = documentsCol(tenantId).doc();
    const document: RealEstateDocument = {
      id: docRef.id,
      tenantId,
      linkedEntityType: data.linkedEntityType,
      linkedEntityId: data.linkedEntityId,
      title: data.title,
      docType: data.docType,
      tags: data.tags || [],
      validUntil: data.validUntil ?? null,
      version: nextVersion,
      status: "active",
      storagePath: data.storagePath,
      fileName: data.fileName,
      mimeType: data.mimeType,
      sizeBytes: data.sizeBytes,
      checksum: data.checksum ?? null,
      createdAt: now,
      createdBy: user.uid,
      updatedAt: now,
      updatedBy: user.uid,
      versionKey,
    };

    tx.set(docRef, document);
    tx.delete(sessionRef);

    return document;
  });

  return newDoc;
}

export async function listDocuments(
  tenantId: string,
  query: unknown
): Promise<RealEstateDocument[]> {
  const params = documentListQuerySchema.parse(query);
  let ref: FirebaseFirestore.Query = documentsCol(tenantId);

  if (params.linkedEntityType) {
    ref = ref.where("linkedEntityType", "==", params.linkedEntityType);
  }
  if (params.linkedEntityId) {
    ref = ref.where("linkedEntityId", "==", params.linkedEntityId);
  }
  if (params.docType) {
    ref = ref.where("docType", "==", params.docType);
  }
  if (params.status) {
    ref = ref.where("status", "==", params.status);
  }
  if (params.validBefore || params.validAfter) {
    ref = ref.orderBy("validUntil");
  } else {
    ref = ref.orderBy("createdAt", "desc");
  }
  if (params.validBefore) {
    ref = ref.where("validUntil", "<=", params.validBefore);
  }
  if (params.validAfter) {
    ref = ref.where("validUntil", ">=", params.validAfter);
  }

  const limit = params.limit ?? 20;
  ref = ref.limit(limit);

  const snap = await ref.get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

// ============================================================
// 📄 Contracts CRUD
// ============================================================

type StatementTotals = {
  income: number;
  expenses: number;
  fees: number;
  net: number;
};

function parsePeriodRange(period: string): { start: Date; end: Date } {
  const [yearStr, monthStr] = period.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr) - 1;
  const start = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59));
  return { start, end };
}

function formatBRL(n: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(n);
}

async function buildStatementHtml(
  ownerId: string,
  period: string,
  totals: StatementTotals,
  transactions: Array<{ date: string; description: string; amount: number }>
): Promise<string> {
  const rows = transactions
    .map(
      (t) => `<tr>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${t.date}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${t.description}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0; text-align:right;">${formatBRL(
        t.amount
      )}</td>
      </tr>`
    )
    .join("");

  return `
  <html>
    <head>
      <meta charset="UTF-8" />
      <title>Extrato ${period} - ${ownerId}</title>
    </head>
    <body style="font-family: Inter, Arial, sans-serif; background: #0f172a; padding: 24px; color: #0f172a;">
      <div style="max-width: 960px; margin: 0 auto; background: #f8fafc; border-radius: 16px; padding: 24px; box-shadow: 0 10px 40px rgba(15,23,42,0.15);">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
          <div>
            <p style="text-transform: uppercase; font-size: 11px; color: #64748b; letter-spacing: 1px; margin: 0;">Momentum • Real Estate</p>
            <h1 style="font-size: 20px; margin: 4px 0 0 0; color: #0f172a;">Extrato do Proprietário</h1>
            <p style="color: #475569; margin: 4px 0 0 0;">Período: ${period}</p>
          </div>
          <div style="height: 40px; width: 40px; border-radius: 12px; background: #0ea5e9; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800;">M</div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px,1fr)); gap: 12px; margin-bottom: 20px;">
          <div style="background: white; border-radius: 12px; padding: 12px; border: 1px solid #e2e8f0;">
            <p style="font-size: 12px; color: #64748b; margin:0;">Receitas</p>
            <p style="font-size: 18px; font-weight: 800; margin:4px 0 0 0;">${formatBRL(
              totals.income
            )}</p>
          </div>
          <div style="background: white; border-radius: 12px; padding: 12px; border: 1px solid #e2e8f0;">
            <p style="font-size: 12px; color: #64748b; margin:0;">Despesas</p>
            <p style="font-size: 18px; font-weight: 800; margin:4px 0 0 0; color:#ef4444;">${formatBRL(
              totals.expenses
            )}</p>
          </div>
          <div style="background: white; border-radius: 12px; padding: 12px; border: 1px solid #e2e8f0;">
            <p style="font-size: 12px; color: #64748b; margin:0;">Taxa de Administração</p>
            <p style="font-size: 18px; font-weight: 800; margin:4px 0 0 0; color:#f97316;">${formatBRL(
              totals.fees
            )}</p>
          </div>
          <div style="background: white; border-radius: 12px; padding: 12px; border: 1px solid #e2e8f0;">
            <p style="font-size: 12px; color: #64748b; margin:0;">Repasse Líquido</p>
            <p style="font-size: 18px; font-weight: 800; margin:4px 0 0 0; color:#0ea5e9;">${formatBRL(
              totals.net
            )}</p>
          </div>
        </div>

        <table style="width:100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
          <thead style="background: #f1f5f9; text-align: left;">
            <tr>
              <th style="padding:10px; font-size:12px; color:#475569;">Data</th>
              <th style="padding:10px; font-size:12px; color:#475569;">Descrição</th>
              <th style="padding:10px; font-size:12px; color:#475569; text-align:right;">Valor</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    </body>
  </html>
  `;
}

export async function generateOwnerStatement(
  tenantId: string,
  ownerId: string,
  period: string,
  generatedBy?: string
): Promise<OwnerStatement & { htmlUrl?: string }> {
  generateStatementSchema.parse({ ownerId, period });
  const { start, end } = parsePeriodRange(period);
  const unitsSnap = await unitsCol(tenantId).where("ownerId", "==", ownerId).get();
  const unitIds = unitsSnap.docs.map((d: FirebaseFirestore.QueryDocumentSnapshot) => d.id);

  const existingSnap = await statementsCol(tenantId)
    .where("idempotencyKey", "==", `${tenantId}:${ownerId}:${period}`)
    .limit(1)
    .get();

  const bucket = storage.bucket();

  if (!existingSnap.empty) {
    const existing = existingSnap.docs[0].data() as OwnerStatement;
    const file = bucket.file(existing.htmlPath || "");
    const [url] = existing.htmlPath
      ? await file.getSignedUrl({ version: "v4", action: "read", expires: Date.now() + 15 * 60 * 1000 })
      : [undefined];
    return { ...existing, htmlUrl: url };
  }

  const transactionsQuery = transactionsCol(tenantId)
    .orderBy("date", "desc")
    .where("date", ">=", start.toISOString().slice(0, 10))
    .where("date", "<=", end.toISOString().slice(0, 10));

  const txSnap = await transactionsQuery.get().catch(async () => {
    const fallback = await transactionsCol(tenantId).orderBy("date", "desc").limit(500).get();
    return fallback;
  });

  const filtered: Array<{ date: string; description: string; amount: number; unitId?: string }> = [];
  txSnap.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
    const data = doc.data() as any;
    if (unitIds.length && data.unitId && !unitIds.includes(data.unitId)) return;
    const dateStr = data.date || data.dueDate || data.createdAt || doc.createTime?.toDate().toISOString();
    if (!dateStr) return;
    const iso = new Date(dateStr).toISOString().slice(0, 10);
    if (iso < start.toISOString().slice(0, 10) || iso > end.toISOString().slice(0, 10)) return;
    filtered.push({
      date: iso,
      description: data.description || data.title || "Transação",
      amount: Number(data.amount ?? 0),
      unitId: data.unitId,
    });
  });

  let income = 0;
  let expenses = 0;
  filtered.forEach((t) => {
    if (t.amount >= 0) income += t.amount;
    else expenses += Math.abs(t.amount);
  });
  const fees = income * 0.1;
  const net = income - expenses - fees;

  const html = await buildStatementHtml(ownerId, period, { income, expenses, fees, net }, filtered);
  const storagePath = `tenants/${tenantId}/statements/${ownerId}/${period}.html`;
  const file = bucket.file(storagePath);
  await file.save(html, { contentType: "text/html" });

  const [htmlUrl] = await file.getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + 15 * 60 * 1000,
  });

  const now = new Date().toISOString();
  const statement: OwnerStatement = {
    id: `${ownerId}-${period}`,
    tenantId,
    ownerId,
    period,
    unitIds,
    totals: { income, expenses, fees, net },
    generatedAt: now,
    generatedBy: generatedBy || "system",
    htmlPath: storagePath,
    pdfPath: undefined,
    status: "ready",
    idempotencyKey: `${tenantId}:${ownerId}:${period}`,
  };

  await statementsCol(tenantId).doc(statement.id).set(statement);
  return { ...statement, htmlUrl };
}

export async function listOwnerStatements(
  tenantId: string,
  ownerId?: string
): Promise<Array<OwnerStatement & { htmlUrl?: string }>> {
  let ref = statementsCol(tenantId).orderBy("generatedAt", "desc") as FirebaseFirestore.Query;
  if (ownerId) {
    ref = ref.where("ownerId", "==", ownerId);
  }
  const snap = await ref.limit(50).get();
  const bucket = storage.bucket();

  const results: Array<OwnerStatement & { htmlUrl?: string }> = [];
  for (let i = 0; i < snap.docs.length; i++) {
    const doc = snap.docs[i] as FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>;
    const data = doc.data() as OwnerStatement;
    let htmlUrl: string | undefined;
    if (data.htmlPath) {
      const file = bucket.file(data.htmlPath);
      const [url] = await file.getSignedUrl({
        version: "v4",
        action: "read",
        expires: Date.now() + 15 * 60 * 1000,
      });
      htmlUrl = url;
    }
    results.push({ ...data, htmlUrl });
  }

  return results;
}

export async function listContracts(
  tenantId: string,
  unitId?: string
): Promise<Contract[]> {
  let ref = contractsCol(tenantId).orderBy("updatedAt", "desc") as FirebaseFirestore.Query;
  if (unitId) {
    ref = ref.where("unitId", "==", unitId);
  }
  const snap = await ref.get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Contract[];
}

export async function createContract(
  tenantId: string,
  data: Omit<Contract, "id" | "createdAt" | "updatedAt">
): Promise<Contract> {
  const timestamp = new Date().toISOString();
  const payload = {
    ...data,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const doc = await contractsCol(tenantId).add(payload);
  return { id: doc.id, ...payload };
}

export async function updateContract(
  tenantId: string,
  id: string,
  data: Partial<Omit<Contract, "id" | "createdAt">>
): Promise<void> {
  const payload = { ...data, updatedAt: new Date().toISOString() };
  await contractsCol(tenantId).doc(id).update(payload);
}

export async function deleteContract(tenantId: string, id: string): Promise<void> {
  await contractsCol(tenantId).doc(id).delete();
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
