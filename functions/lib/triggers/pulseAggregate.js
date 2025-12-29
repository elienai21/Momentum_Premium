"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.pulseAggregateOnWrite = void 0;
// functions/src/triggers/pulseAggregate.ts
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
const logger_1 = require("../utils/logger");
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
function asDate(v) {
    if (!v)
        return new Date();
    if (v instanceof Date)
        return v;
    if (typeof v.toDate === "function")
        return v.toDate();
    if (typeof v === "string")
        return new Date(v);
    return new Date();
}
function round2(n) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
}
function objectRound2(rec) {
    return Object.fromEntries(Object.entries(rec).map(([k, v]) => [k, round2(v)]));
}
/**
 * 🧮 Trigger de agregação:
 * Sempre que um documento em tenants/{tenantId}/transactions/{txId} é criado/alterado/deletado,
 * recalculamos o resumo dos ÚLTIMOS 30 DIAS e salvamos em tenants/{tenantId}/pulseCache/last30.
 */
exports.pulseAggregateOnWrite = (0, firestore_1.onDocumentWritten)({
    document: "tenants/{tenantId}/transactions/{txId}",
    region: "southamerica-east1", // 👈 mesma região do apiV2/cfoNightly
}, async (event) => {
    const tenantId = event.params.tenantId;
    if (!tenantId) {
        logger_1.logger.warn("[pulseAggregateOnWrite] tenantId ausente em params");
        return;
    }
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 29);
    const end = now;
    const startISO = start.toISOString().slice(0, 10);
    const endISO = end.toISOString().slice(0, 10);
    try {
        const colPath = `tenants/${tenantId}/transactions`;
        const ref = db.collection(colPath);
        // Mantemos a mesma estratégia do Pulse: orderBy + limit e filtragem em memória.
        const snap = await ref.orderBy("date", "asc").limit(2000).get();
        if (snap.empty) {
            // Nenhuma transação → salvamos um cache vazio
            const emptyDoc = {
                tenantId,
                period: { start: startISO, end: endISO },
                kpis: {
                    cash_in: 0,
                    cash_out: 0,
                    net_cash: 0,
                    opening_balance: 0,
                    closing_balance: 0,
                    runway_days: null,
                },
                inflows: { total: 0, byCategory: {} },
                outflows: { total: 0, byCategory: {} },
                balanceSeries: [],
                projections: {
                    runwayText: "Runway não disponível com os dados atuais.",
                },
                sources: ["firestore"],
                hasData: false,
                debugFsTxCount: 0,
            };
            await db
                .doc(`tenants/${tenantId}/pulseCache/last30`)
                .set({
                ...emptyDoc,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
            logger_1.logger.info("[pulseAggregateOnWrite] Cache vazio atualizado", {
                tenantId,
                colPath,
            });
            return;
        }
        const allTxs = snap.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                date: data.date ??
                    data.dueDate ??
                    data.createdAt ??
                    new Date().toISOString(),
                amount: Number(data.amount ?? data.value ?? 0),
                type: data.type,
                category: data.category || data.group || data.tag,
                status: data.status,
            };
        });
        // Filtra pelo período (últimos 30 dias)
        const filtered = allTxs.filter((tx) => {
            const d = asDate(tx.date);
            return d >= start && d <= end;
        });
        let cashIn = 0;
        let cashOut = 0;
        const inflowByCat = {};
        const outflowByCat = {};
        const dailyBalance = {};
        const openingBalance = 0;
        let balance = openingBalance;
        for (const tx of filtered) {
            const d = asDate(tx.date);
            const dayKey = d.toISOString().slice(0, 10);
            const rawAmount = typeof tx.amount === "number" ? tx.amount : 0;
            const isOut = rawAmount < 0 || tx.type === "out";
            const amt = Math.abs(rawAmount);
            const cat = tx.category || "Outros";
            if (isOut) {
                cashOut += amt;
                outflowByCat[cat] = (outflowByCat[cat] ?? 0) + amt;
                balance -= amt;
            }
            else {
                cashIn += amt;
                inflowByCat[cat] = (inflowByCat[cat] ?? 0) + amt;
                balance += amt;
            }
            dailyBalance[dayKey] = balance;
        }
        const closingBalance = balance;
        const netCash = cashIn - cashOut;
        let runway_days = null;
        if (netCash < 0 && closingBalance > 0) {
            const days = Math.max(1, Object.keys(dailyBalance).length || 30);
            const avgBurn = Math.abs(netCash) / days;
            runway_days = avgBurn > 0 ? closingBalance / avgBurn : null;
        }
        const kpis = {
            cash_in: round2(cashIn),
            cash_out: round2(cashOut),
            net_cash: round2(netCash),
            opening_balance: round2(openingBalance),
            closing_balance: round2(closingBalance),
            runway_days: runway_days ? round2(runway_days) : null,
        };
        const balanceSeries = Object.entries(dailyBalance)
            .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
            .map(([date, value]) => ({ date, balance: round2(value) }));
        const sources = filtered.length ? ["firestore"] : [];
        const doc = {
            tenantId,
            period: { start: startISO, end: endISO },
            kpis,
            inflows: {
                total: round2(cashIn),
                byCategory: objectRound2(inflowByCat),
            },
            outflows: {
                total: round2(cashOut),
                byCategory: objectRound2(outflowByCat),
            },
            balanceSeries,
            projections: {
                runwayText: runway_days && runway_days > 0
                    ? `Runway estimado de aproximadamente ${Math.round(runway_days)} dias com o saldo atual.`
                    : "Runway não disponível com os dados atuais.",
            },
            sources,
            hasData: filtered.length > 0,
            debugFsTxCount: filtered.length,
        };
        await db
            .doc(`tenants/${tenantId}/pulseCache/last30`)
            .set({
            ...doc,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        logger_1.logger.info("[pulseAggregateOnWrite] Cache last30 atualizado", {
            tenantId,
            txCount: filtered.length,
        });
    }
    catch (err) {
        logger_1.logger.error("[pulseAggregateOnWrite] erro ao agregar Pulse", {
            tenantId,
            error: err?.message,
            stack: err?.stack,
        });
    }
});
