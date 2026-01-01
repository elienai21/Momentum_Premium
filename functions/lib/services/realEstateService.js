"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOwner = createOwner;
exports.listOwners = listOwners;
exports.createUnit = createUnit;
exports.listUnits = listUnits;
exports.initDocumentUpload = initDocumentUpload;
exports.commitDocument = commitDocument;
exports.listDocuments = listDocuments;
exports.generateOwnerStatement = generateOwnerStatement;
exports.listOwnerStatements = listOwnerStatements;
exports.generateReceivablesBatch = generateReceivablesBatch;
exports.recordPayment = recordPayment;
exports.calculateAgingSnapshot = calculateAgingSnapshot;
exports.getAgingSnapshot = getAgingSnapshot;
exports.listReceivables = listReceivables;
exports.listContracts = listContracts;
exports.createContract = createContract;
exports.updateContract = updateContract;
exports.deleteContract = deleteContract;
exports.createBuilding = createBuilding;
exports.listBuildings = listBuildings;
exports.updateBuilding = updateBuilding;
exports.archiveBuilding = archiveBuilding;
exports.registerStay = registerStay;
exports.listStaysByUnit = listStaysByUnit;
exports.registerStayFromStaysCsv = registerStayFromStaysCsv;
exports.registerExpense = registerExpense;
exports.listExpensesByUnit = listExpensesByUnit;
exports.registerExpenseFromPayload = registerExpenseFromPayload;
exports.generateMonthlyStatement = generateMonthlyStatement;
exports.getOrGenerateMonthlyStatement = getOrGenerateMonthlyStatement;
exports.getPortfolioSummary = getPortfolioSummary;
const firebase_1 = require("./firebase");
const firebase_2 = require("./firebase");
const realEstate_1 = require("../types/realEstate");
const realEstate_2 = require("../types/realEstate");
function ownersCol(tenantId) {
    return firebase_1.db.collection(`tenants/${tenantId}/realEstate_owners`);
}
function unitsCol(tenantId) {
    return firebase_1.db.collection(`tenants/${tenantId}/realEstate_units`);
}
function contractsCol(tenantId) {
    return firebase_1.db.collection(`tenants/${tenantId}/realEstate_contracts`);
}
function staysCol(tenantId) {
    return firebase_1.db.collection(`tenants/${tenantId}/realEstate_stays`);
}
function expensesCol(tenantId) {
    return firebase_1.db.collection(`tenants/${tenantId}/realEstate_expenses`);
}
function statementsCol(tenantId) {
    return firebase_1.db.collection(`tenants/${tenantId}/realEstate_statements`);
}
function buildingsCol(tenantId) {
    return firebase_1.db.collection(`tenants/${tenantId}/realEstate_buildings`);
}
function transactionsCol(tenantId) {
    return firebase_1.db.collection(`tenants/${tenantId}/transactions`);
}
function receivablesCol(tenantId) {
    return firebase_1.db.collection(`tenants/${tenantId}/receivables`);
}
function agingSnapshotDoc(tenantId) {
    return firebase_1.db.doc(`tenants/${tenantId}/analytics/aging_snapshot`);
}
function documentsCol(tenantId) {
    return firebase_1.db.collection(`tenants/${tenantId}/documents`);
}
function uploadSessionsCol(tenantId) {
    return firebase_1.db.collection(`tenants/${tenantId}/documentUploads`);
}
async function findUnitByCode(tenantId, unitCode) {
    const code = unitCode?.trim();
    if (!code) {
        throw Object.assign(new Error("Unit code is required"), { statusCode: 400 });
    }
    const unitSnap = await unitsCol(tenantId)
        .where("code", "==", code)
        .limit(1)
        .get();
    if (unitSnap.empty) {
        throw Object.assign(new Error(`Unit not found for code ${code}`), { statusCode: 404 });
    }
    const unitDoc = unitSnap.docs[0];
    const unitData = unitDoc.data();
    return { unitId: unitDoc.id, ownerId: unitData.ownerId };
}
async function createOwner(tenantId, data) {
    const createdAt = new Date().toISOString();
    const doc = await ownersCol(tenantId).add({ ...data, createdAt });
    return { id: doc.id, createdAt, ...data };
}
async function listOwners(tenantId) {
    const snap = await ownersCol(tenantId).orderBy("createdAt", "desc").get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
async function createUnit(tenantId, data) {
    const createdAt = new Date().toISOString();
    const payload = { ...data, active: true, createdAt };
    const doc = await unitsCol(tenantId).add(payload);
    return { id: doc.id, ...payload };
}
async function listUnits(tenantId) {
    const snap = await unitsCol(tenantId).orderBy("createdAt", "desc").get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
async function initDocumentUpload(tenantId, payload, user) {
    const data = realEstate_1.documentInitUploadSchema.parse(payload);
    const safeFileName = data.fileName.replace(/[^\w.\-]/g, "_");
    const storagePath = `tenants/${tenantId}/docs/${data.linkedEntityType}/${data.linkedEntityId}/${Date.now()}-${safeFileName}`;
    const sessionRef = await uploadSessionsCol(tenantId).add({
        ...data,
        storagePath,
        createdAt: new Date().toISOString(),
        createdBy: user.uid,
    });
    const bucket = firebase_2.storage.bucket();
    const file = bucket.file(storagePath);
    const [uploadUrl] = await file.getSignedUrl({
        version: "v4",
        action: "write",
        expires: Date.now() + 15 * 60 * 1000,
        contentType: data.mimeType,
    });
    return { uploadSessionId: sessionRef.id, uploadUrl, storagePath };
}
async function commitDocument(tenantId, payload, user) {
    const data = realEstate_1.documentCommitSchema.parse(payload);
    const expectedPrefix = `tenants/${tenantId}/docs/${data.linkedEntityType}/${data.linkedEntityId}/`;
    if (!data.storagePath.startsWith(expectedPrefix)) {
        throw Object.assign(new Error("invalid_storage_path"), { statusCode: 400 });
    }
    const sessionRef = uploadSessionsCol(tenantId).doc(data.uploadSessionId);
    const sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists) {
        throw Object.assign(new Error("upload_session_not_found"), { statusCode: 404 });
    }
    const session = sessionSnap.data();
    if (session.createdBy !== user.uid || session.storagePath !== data.storagePath) {
        throw Object.assign(new Error("upload_session_mismatch"), { statusCode: 403 });
    }
    const versionKey = `${data.linkedEntityType}:${data.linkedEntityId}:${data.docType}`;
    const now = new Date().toISOString();
    const newDoc = await firebase_1.db.runTransaction(async (tx) => {
        const activeQuery = await tx.get(documentsCol(tenantId)
            .where("versionKey", "==", versionKey)
            .where("status", "==", "active")
            .limit(1));
        let nextVersion = 1;
        if (!activeQuery.empty) {
            const activeDoc = activeQuery.docs[0];
            const current = activeDoc.data();
            nextVersion = (current.version || 1) + 1;
            tx.update(activeDoc.ref, {
                status: "archived",
                updatedAt: now,
                updatedBy: user.uid,
            });
        }
        const docRef = documentsCol(tenantId).doc();
        const document = {
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
async function listDocuments(tenantId, query) {
    const params = realEstate_1.documentListQuerySchema.parse(query);
    let ref = documentsCol(tenantId);
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
    }
    else {
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
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
function parsePeriodRange(period) {
    const [yearStr, monthStr] = period.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr) - 1;
    const start = new Date(Date.UTC(year, month, 1, 0, 0, 0));
    const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59));
    return { start, end };
}
function formatBRL(n) {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 2,
    }).format(n);
}
async function buildStatementHtml(ownerId, period, totals, transactions) {
    const rows = transactions
        .map((t) => `<tr>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${t.date}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${t.description}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0; text-align:right;">${formatBRL(t.amount)}</td>
      </tr>`)
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
            <p style="font-size: 18px; font-weight: 800; margin:4px 0 0 0;">${formatBRL(totals.income)}</p>
          </div>
          <div style="background: white; border-radius: 12px; padding: 12px; border: 1px solid #e2e8f0;">
            <p style="font-size: 12px; color: #64748b; margin:0;">Despesas</p>
            <p style="font-size: 18px; font-weight: 800; margin:4px 0 0 0; color:#ef4444;">${formatBRL(totals.expenses)}</p>
          </div>
          <div style="background: white; border-radius: 12px; padding: 12px; border: 1px solid #e2e8f0;">
            <p style="font-size: 12px; color: #64748b; margin:0;">Taxa de Administração</p>
            <p style="font-size: 18px; font-weight: 800; margin:4px 0 0 0; color:#f97316;">${formatBRL(totals.fees)}</p>
          </div>
          <div style="background: white; border-radius: 12px; padding: 12px; border: 1px solid #e2e8f0;">
            <p style="font-size: 12px; color: #64748b; margin:0;">Repasse Líquido</p>
            <p style="font-size: 18px; font-weight: 800; margin:4px 0 0 0; color:#0ea5e9;">${formatBRL(totals.net)}</p>
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
async function generateOwnerStatement(tenantId, ownerId, period, generatedBy) {
    realEstate_2.generateStatementSchema.parse({ ownerId, period });
    const { start, end } = parsePeriodRange(period);
    const unitsSnap = await unitsCol(tenantId).where("ownerId", "==", ownerId).get();
    const unitIds = unitsSnap.docs.map((d) => d.id);
    const existingSnap = await statementsCol(tenantId)
        .where("idempotencyKey", "==", `${tenantId}:${ownerId}:${period}`)
        .limit(1)
        .get();
    const bucket = firebase_2.storage.bucket();
    if (!existingSnap.empty) {
        const existing = existingSnap.docs[0].data();
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
    const filtered = [];
    txSnap.forEach((doc) => {
        const data = doc.data();
        if (unitIds.length && data.unitId && !unitIds.includes(data.unitId))
            return;
        const dateStr = data.date || data.dueDate || data.createdAt || doc.createTime?.toDate().toISOString();
        if (!dateStr)
            return;
        const iso = new Date(dateStr).toISOString().slice(0, 10);
        if (iso < start.toISOString().slice(0, 10) || iso > end.toISOString().slice(0, 10))
            return;
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
        if (t.amount >= 0)
            income += t.amount;
        else
            expenses += Math.abs(t.amount);
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
    const statement = {
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
async function listOwnerStatements(tenantId, ownerId) {
    let ref = statementsCol(tenantId).orderBy("generatedAt", "desc");
    if (ownerId) {
        ref = ref.where("ownerId", "==", ownerId);
    }
    const snap = await ref.limit(50).get();
    const bucket = firebase_2.storage.bucket();
    const results = [];
    for (let i = 0; i < snap.docs.length; i++) {
        const doc = snap.docs[i];
        const data = doc.data();
        let htmlUrl;
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
async function generateReceivablesBatch(tenantId, period) {
    const { start, end } = parsePeriodRange(period);
    const unitsSnap = await unitsCol(tenantId).get();
    const unitsById = new Map();
    unitsSnap.forEach((u) => unitsById.set(u.id, { id: u.id, ...u.data() }));
    const contractsSnap = await contractsCol(tenantId).get();
    const receivablesRef = receivablesCol(tenantId);
    const now = new Date().toISOString();
    let created = 0;
    for (const contractDoc of contractsSnap.docs) {
        const contract = contractDoc.data();
        const contractStart = new Date(contract.startDate);
        const contractEnd = new Date(contract.endDate);
        if (contractStart > end || contractEnd < start)
            continue;
        const existing = await receivablesRef
            .where("contractId", "==", contractDoc.id)
            .where("period", "==", period)
            .limit(1)
            .get();
        if (!existing.empty)
            continue;
        const dueDate = `${period}-10`;
        const unit = unitsById.get(contract.unitId);
        const payload = {
            tenantId,
            contractId: contractDoc.id,
            unitId: contract.unitId,
            ownerId: unit?.ownerId || "",
            tenantName: contract.tenantName,
            period,
            dueDate,
            amount: contract.rentAmount,
            amountPaid: 0,
            status: "open",
            paidAt: null,
            createdAt: now,
            updatedAt: now,
        };
        await receivablesRef.add(payload);
        created += 1;
    }
    return { created };
}
async function recordPayment(tenantId, receivableId, amount, paidAt) {
    const ref = receivablesCol(tenantId).doc(receivableId);
    const snap = await ref.get();
    if (!snap.exists) {
        throw Object.assign(new Error("receivable_not_found"), { statusCode: 404 });
    }
    const data = snap.data();
    const newAmountPaid = (data.amountPaid || 0) + amount;
    const status = newAmountPaid >= data.amount ? "paid" : "partial";
    const updated = {
        amountPaid: newAmountPaid,
        status,
        paidAt,
        updatedAt: new Date().toISOString(),
    };
    await ref.update(updated);
    return { ...data, ...updated, id: receivableId };
}
async function calculateAgingSnapshot(tenantId) {
    const snap = await receivablesCol(tenantId)
        .where("status", "in", ["open", "overdue", "partial"])
        .get();
    const buckets = {
        d0_30: { total: 0, count: 0 },
        d31_60: { total: 0, count: 0 },
        d61_90: { total: 0, count: 0 },
        d90_plus: { total: 0, count: 0 },
    };
    const today = new Date();
    snap.forEach((doc) => {
        const data = doc.data();
        const outstanding = Math.max(0, data.amount - (data.amountPaid || 0));
        if (outstanding <= 0)
            return;
        const due = new Date(data.dueDate);
        const diffDays = Math.max(0, Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)));
        let bucketKey = "d0_30";
        if (diffDays > 90)
            bucketKey = "d90_plus";
        else if (diffDays > 60)
            bucketKey = "d61_90";
        else if (diffDays > 30)
            bucketKey = "d31_60";
        buckets[bucketKey].count += 1;
        buckets[bucketKey].total += outstanding;
    });
    const asOfDate = today.toISOString().slice(0, 10);
    await agingSnapshotDoc(tenantId).set({
        asOfDate,
        buckets,
        updatedAt: new Date().toISOString(),
    });
    return { asOfDate, buckets };
}
async function getAgingSnapshot(tenantId) {
    const snap = await agingSnapshotDoc(tenantId).get();
    if (!snap.exists)
        return null;
    return snap.data();
}
async function listReceivables(tenantId, filters) {
    const parsed = realEstate_1.receivableListQuerySchema.parse(filters);
    let ref = receivablesCol(tenantId);
    if (parsed.period)
        ref = ref.where("period", "==", parsed.period);
    if (parsed.status)
        ref = ref.where("status", "==", parsed.status);
    if (parsed.ownerId)
        ref = ref.where("ownerId", "==", parsed.ownerId);
    if (parsed.unitId)
        ref = ref.where("unitId", "==", parsed.unitId);
    if (parsed.contractId)
        ref = ref.where("contractId", "==", parsed.contractId);
    ref = ref.orderBy("dueDate", "desc").limit(parsed.limit ?? 100);
    const snap = await ref.get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
// ============================================================
// 📄 Contracts CRUD
// ============================================================
async function listContracts(tenantId, unitId) {
    let ref = contractsCol(tenantId).orderBy("updatedAt", "desc");
    if (unitId) {
        ref = ref.where("unitId", "==", unitId);
    }
    const snap = await ref.get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
async function createContract(tenantId, data) {
    const timestamp = new Date().toISOString();
    const payload = {
        ...data,
        createdAt: timestamp,
        updatedAt: timestamp,
    };
    const doc = await contractsCol(tenantId).add(payload);
    return { id: doc.id, ...payload };
}
async function updateContract(tenantId, id, data) {
    const payload = { ...data, updatedAt: new Date().toISOString() };
    await contractsCol(tenantId).doc(id).update(payload);
}
async function deleteContract(tenantId, id) {
    await contractsCol(tenantId).doc(id).delete();
}
// ============================================================
// 🏢 Building CRUD
// ============================================================
async function createBuilding(tenantId, data) {
    const createdAt = new Date().toISOString();
    const payload = { ...data, active: true, createdAt };
    const doc = await buildingsCol(tenantId).add(payload);
    return { id: doc.id, ...payload };
}
async function listBuildings(tenantId) {
    const snap = await buildingsCol(tenantId)
        .where("active", "==", true)
        .orderBy("createdAt", "desc")
        .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
async function updateBuilding(tenantId, id, data) {
    await buildingsCol(tenantId).doc(id).update(data);
}
async function archiveBuilding(tenantId, id) {
    await buildingsCol(tenantId).doc(id).update({ active: false });
}
async function registerStay(tenantId, data) {
    const createdAt = new Date().toISOString();
    const netRevenue = (data.grossRevenue || 0) -
        (data.platformFees || 0) -
        (data.cleaningFees || 0) -
        (data.otherCosts || 0);
    const payload = { ...data, createdAt, netRevenue };
    const doc = await staysCol(tenantId).add(payload);
    return { id: doc.id, ...payload };
}
async function listStaysByUnit(tenantId, unitId) {
    const snap = await staysCol(tenantId)
        .where("unitId", "==", unitId)
        .orderBy("checkIn", "desc")
        .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
function calculateNights(checkIn, checkOut) {
    if (!checkIn || !checkOut)
        return undefined;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()))
        return undefined;
    const diffMs = end.getTime() - start.getTime();
    if (diffMs <= 0)
        return undefined;
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}
async function registerStayFromStaysCsv(tenantId, payload) {
    const { unitId, ownerId } = await findUnitByCode(tenantId, payload.unitCode);
    // Datas e noites
    const checkIn = payload.checkIn;
    const checkOut = payload.checkOut;
    const calculatedNights = calculateNights(checkIn, checkOut);
    const nights = payload.nights && payload.nights > 0
        ? payload.nights
        : calculatedNights || 0;
    // Valores financeiros com fallbacks
    const grossRevenue = payload.grossRevenue ??
        payload.raw?.precoVendaCorrigido ??
        payload.raw?.totalReserva ??
        0;
    const cleaningFees = payload.cleaningFees ?? payload.raw?.taxaLimpeza ?? 0;
    const platformFees = payload.platformFees ?? payload.raw?.taxasRepasse ?? 0;
    const otherCosts = payload.otherCosts ?? payload.raw?.taxasExtras ?? 0;
    const netRevenue = (grossRevenue || 0) -
        (cleaningFees || 0) -
        (platformFees || 0) -
        (otherCosts || 0);
    const createdAt = payload.createdAt || new Date().toISOString();
    const stayData = {
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
async function registerExpense(tenantId, data) {
    const createdAt = new Date().toISOString();
    const payload = { ...data, createdAt };
    const doc = await expensesCol(tenantId).add(payload);
    return { id: doc.id, ...payload };
}
async function listExpensesByUnit(tenantId, unitId) {
    const snap = await expensesCol(tenantId)
        .where("unitId", "==", unitId)
        .orderBy("incurredAt", "desc")
        .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
async function registerExpenseFromPayload(tenantId, payload) {
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
    const expense = {
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
async function generateMonthlyStatement(tenantId, ownerId, month) {
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
    const ownerData = ownerSnap.data();
    const ownerShareRate = typeof ownerData?.ownerShareRate === "number"
        ? Math.max(0, Math.min(1, ownerData.ownerShareRate))
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
    const unitsData = unitsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const unitIds = unitsData.map((u) => u.id);
    const unitById = unitsData.reduce((acc, u) => {
        acc[u.id] = u;
        return acc;
    }, {});
    // Stays in month
    const staysSnap = await staysCol(tenantId)
        .where("ownerId", "==", ownerId)
        .where("checkIn", ">=", startIso)
        .where("checkIn", "<", endIso)
        .get();
    const stays = staysSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    // Expenses in month
    const expensesSnap = await expensesCol(tenantId)
        .where("ownerId", "==", ownerId)
        .where("incurredAt", ">=", startIso)
        .where("incurredAt", "<", endIso)
        .get();
    const expenses = expensesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
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
    const totals = unitsAggregated.reduce((acc, u) => {
        acc.grossRevenue += u.grossRevenue;
        acc.totalExpenses += u.totalExpenses;
        acc.netRevenue += u.netRevenue;
        return acc;
    }, { grossRevenue: 0, totalExpenses: 0, netRevenue: 0 });
    const ownerPayout = totals.netRevenue * ownerShareRate;
    const generatedAt = new Date().toISOString();
    const statement = {
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
async function getOrGenerateMonthlyStatement(tenantId, ownerId, month) {
    const docId = `${ownerId}_${month}`;
    const existing = await statementsCol(tenantId).doc(docId).get();
    if (existing.exists) {
        return { id: docId, ...existing.data() };
    }
    return generateMonthlyStatement(tenantId, ownerId, month);
}
const SUMMARY_CACHE = {};
async function getPortfolioSummary(tenantId, days = 30) {
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
    const activeUnitsCount = unitsSnap.docs.filter((d) => d.data().active).length;
    // 2. Stats financeiras (Stays & Expenses no período)
    const staysSnap = await staysCol(tenantId)
        .where("checkIn", ">=", startIso)
        .where("checkIn", "<", endIso)
        .get();
    const expensesSnap = await expensesCol(tenantId)
        .where("incurredAt", ">=", startIso)
        .where("incurredAt", "<", endIso)
        .get();
    const stays = staysSnap.docs.map((d) => d.data());
    const expenses = expensesSnap.docs.map((d) => d.data());
    const grossRevenue = stays.reduce((sum, s) => sum + (s.grossRevenue || 0), 0);
    const staysFees = stays.reduce((sum, s) => sum + (s.platformFees || 0) + (s.cleaningFees || 0) + (s.otherCosts || 0), 0);
    const expensesAmount = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalExpenses = staysFees + expensesAmount;
    const netRevenue = grossRevenue - totalExpenses;
    const staysCount = stays.length;
    // 3. Billing Preview
    // REMOVED: Hardcoded placeholder values (R$ 10 per owner, R$ 2 per unit)
    // These values were symbolic and did NOT reflect actual plan pricing.
    // When real billing is implemented, read pricing from tenant.plan or marketConfigService.
    // For now, potentialCharges is omitted to avoid misleading customers.
    const summary = {
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
        // potentialCharges: undefined - removed to avoid showing fake pricing
    };
    // Cache por 15 minutos
    SUMMARY_CACHE[cacheKey] = {
        data: summary,
        expires: now + 15 * 60 * 1000
    };
    return summary;
}
