"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOwner = createOwner;
exports.listOwners = listOwners;
exports.createUnit = createUnit;
exports.listUnits = listUnits;
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
function ownersCol(tenantId) {
    return firebase_1.db.collection(`tenants/${tenantId}/realEstate_owners`);
}
function unitsCol(tenantId) {
    return firebase_1.db.collection(`tenants/${tenantId}/realEstate_units`);
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
    // 3. Billing Preview (Estimativa simbólica)
    // R$ 10 por proprietário ativo + R$ 2 por unidade ativa
    const ownerFee = activeOwnersCount * 10;
    const unitFee = activeUnitsCount * 2;
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
