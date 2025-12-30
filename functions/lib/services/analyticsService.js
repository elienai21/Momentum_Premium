"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getForecastForTenant = getForecastForTenant;
exports.filterTransactions = filterTransactions;
// functions/src/services/analyticsService.ts
const firestore_1 = require("firebase-admin/firestore");
const firebase_1 = require("../services/firebase");
const logger_1 = require("../utils/logger");
/**
 * Normaliza qualquer coisa em Date:
 * - Timestamp do Firestore
 * - string (yyyy-mm-dd ou ISO)
 * - Date
 */
function asDate(input) {
    if (!input)
        return new Date(0);
    if (input instanceof Date)
        return input;
    if (input instanceof firestore_1.Timestamp) {
        return input.toDate();
    }
    if (typeof input === "string") {
        const d = new Date(input);
        if (!isNaN(d.getTime()))
            return d;
    }
    return new Date();
}
/**
 * Converte Date em chave de mês "YYYY-MM"
 */
function monthKey(date) {
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const mm = m < 10 ? `0${m}` : String(m);
    return `${y}-${mm}`;
}
/**
 * Carrega transações do tenant em formato normalizado para Analytics.
 * Usa apenas tenants/{tenantId}/transactions por enquanto.
 */
async function loadTenantTransactions(tenantId, start, end, limit = 1000) {
    const colRef = firebase_1.db
        .collection("tenants")
        .doc(tenantId)
        .collection("transactions");
    const snap = await colRef.orderBy("date", "desc").limit(limit).get();
    const all = [];
    snap.forEach((doc) => {
        const data = doc.data() || {};
        const d = asDate(data.date || data.dueDate || data.createdAt || doc.createTime);
        if (d < start || d > end)
            return;
        const rawAmount = Number(data.amount ?? 0) || 0;
        const type = rawAmount >= 0 ? "credit" : "debit";
        const amountAbs = Math.abs(rawAmount);
        const tx = {
            date: d.toISOString().slice(0, 10),
            description: String(data.description ||
                data.title ||
                data.memo ||
                data.reference ||
                "Sem descrição"),
            category: data.category || data.group || data.tag || data.type || "Outros",
            type,
            amount: amountAbs,
            card: data.card || data.cardName || null,
        };
        all.push(tx);
    });
    return all;
}
/**
 * Calcula KPIs e séries a partir das transações normalizadas.
 */
function buildForecastFromTransactions(txs) {
    if (!txs.length) {
        return {
            kpis: { balance: 0, income: 0, expense: 0 },
            charts: {
                months: [],
                incomeSeries: [],
                expenseSeries: [],
                categories: [],
            },
            meta: { categories: [], cards: [] },
        };
    }
    const incomeByMonth = new Map();
    const expenseByMonth = new Map();
    const categoriesMap = new Map();
    const cardsSet = new Set();
    let totalIncome = 0;
    let totalExpense = 0;
    for (const tx of txs) {
        const d = asDate(tx.date);
        const mk = monthKey(d);
        if (tx.type === "credit") {
            totalIncome += tx.amount;
            incomeByMonth.set(mk, (incomeByMonth.get(mk) || 0) + tx.amount);
        }
        else {
            totalExpense += tx.amount;
            expenseByMonth.set(mk, (expenseByMonth.get(mk) || 0) + tx.amount);
        }
        const catKey = tx.category || "Outros";
        categoriesMap.set(catKey, (categoriesMap.get(catKey) || 0) + tx.amount);
        if (tx.card)
            cardsSet.add(tx.card);
    }
    const balance = totalIncome - totalExpense;
    const allMonthKeys = Array.from(new Set([...incomeByMonth.keys(), ...expenseByMonth.keys()])).sort();
    const months = [];
    const incomeSeries = [];
    const expenseSeries = [];
    for (const mk of allMonthKeys) {
        months.push(mk);
        incomeSeries.push(incomeByMonth.get(mk) || 0);
        expenseSeries.push(expenseByMonth.get(mk) || 0);
    }
    const lastIdx = months.length - 1;
    const prevIdx = months.length - 2;
    let balanceTrend;
    let incomeTrend;
    let expenseTrend;
    if (lastIdx >= 0 && prevIdx >= 0) {
        const lastIncome = incomeSeries[lastIdx];
        const prevIncome = incomeSeries[prevIdx];
        const lastExpense = expenseSeries[lastIdx];
        const prevExpense = expenseSeries[prevIdx];
        const lastBalance = lastIncome - lastExpense;
        const prevBalance = prevIncome - prevExpense;
        const pct = (curr, prev) => {
            if (!prev)
                return undefined;
            const v = ((curr - prev) / Math.abs(prev)) * 100;
            return `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
        };
        incomeTrend = pct(lastIncome, prevIncome);
        expenseTrend = pct(lastExpense, prevExpense);
        balanceTrend = pct(lastBalance, prevBalance);
    }
    const categories = Array.from(categoriesMap.entries())
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 8);
    const meta = {
        categories: categories.map((c) => c.category),
        cards: Array.from(cardsSet),
    };
    return {
        kpis: {
            balance,
            income: totalIncome,
            expense: totalExpense,
            balanceTrend,
            incomeTrend,
            expenseTrend,
        },
        charts: {
            months,
            incomeSeries,
            expenseSeries,
            categories,
        },
        meta,
    };
}
/**
 * Forecast/KPIs para o painel Analytics.
 */
async function getForecastForTenant(params) {
    const { tenantId, from, to, locale, traceId } = params;
    const end = to ? asDate(to) : new Date();
    const start = from
        ? asDate(from)
        : new Date(end.getFullYear(), end.getMonth() - 5, 1);
    const txs = await loadTenantTransactions(tenantId, start, end, 1200);
    const result = buildForecastFromTransactions(txs);
    logger_1.logger.info("analytics.forecast_served", {
        tenantId,
        locale,
        traceId,
        txCount: txs.length,
    });
    return result;
}
/**
 * Lista de transações filtradas para a tabela do Analytics.
 */
async function filterTransactions(params) {
    const { tenantId, filter, traceId } = params || {};
    const endRaw = filter?.to || null;
    const fromRaw = filter?.from || null;
    const end = endRaw ? asDate(endRaw) : new Date();
    const start = fromRaw
        ? asDate(fromRaw)
        : new Date(end.getFullYear(), end.getMonth() - 5, 1);
    let txs = await loadTenantTransactions(tenantId, start, end, 2000);
    if (filter?.category) {
        txs = txs.filter((t) => t.category === filter.category);
    }
    if (filter?.type === "credit" || filter?.type === "debit") {
        txs = txs.filter((t) => t.type === filter.type);
    }
    if (filter?.card) {
        txs = txs.filter((t) => t.card === filter.card);
    }
    if (filter?.q) {
        const q = filter.q.toLowerCase();
        txs = txs.filter((t) => t.description.toLowerCase().includes(q));
    }
    txs.sort((a, b) => {
        const da = asDate(a.date).getTime();
        const db = asDate(b.date).getTime();
        return db - da;
    });
    const limited = txs.slice(0, 500);
    logger_1.logger.info("analytics.filter_served", {
        tenantId,
        traceId,
        total: txs.length,
        returned: limited.length,
    });
    return limited;
}
