"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirestoreAdapter = void 0;
const firebase_1 = require("../../services/firebase");
const installments_1 = require("../logic/installments");
const logger_1 = require("../../utils/logger");
class FirestoreAdapter {
    db = firebase_1.db;
    tenantId;
    constructor(tenantId) {
        this.tenantId = tenantId;
    }
    getTenantCollection(collection) {
        if (!this.tenantId) {
            throw new Error("Tenant ID is required for this operation.");
        }
        return this.db.collection(`tenants/${this.tenantId}/${collection}`);
    }
    async getRecords(options) {
        const query = this.getTenantCollection("transactions").orderBy("date", "desc");
        const snapshot = await query.get();
        const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        const total = items.length;
        const limitedItems = items.slice(options.offset || 0, (options.offset || 0) + (options.limit || total));
        return { items: limitedItems, total };
    }
    async addRecord(userId, record) {
        const expandedTransactions = await (0, installments_1.expandInstallments)(userId, record);
        const needsReview = expandedTransactions.some(tx => tx.status === 'review');
        const batch = this.db.batch();
        const collectionRef = this.getTenantCollection("transactions");
        expandedTransactions.forEach(tx => {
            const docRef = collectionRef.doc();
            batch.set(docRef, { ...tx, createdAt: new Date().toISOString() });
        });
        await batch.commit();
        return { count: expandedTransactions.length, needsReview, paymentMethod: record.paymentMethod };
    }
    async updateRecord(id, data) {
        await this.getTenantCollection("transactions").doc(id).update(data);
    }
    async deleteRecord(id) {
        await this.getTenantCollection("transactions").doc(id).delete();
    }
    async getDashboardData() {
        const { items } = await this.getRecords({ limit: 1000 }); // Increased limit for better monthly aggregation
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        let currentBalance = 0;
        let monthlyIncome = 0;
        let monthlyExpense = 0;
        const categoryTotalsMap = {};
        const monthlyTotalsMap = {};
        items.forEach(item => {
            const itemDate = new Date(item.date);
            const monthYear = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}`;
            // Initialize monthly total if not present
            if (!monthlyTotalsMap[monthYear]) {
                monthlyTotalsMap[monthYear] = { income: 0, expense: 0 };
            }
            if (item.amount > 0) { // Income
                currentBalance += item.amount;
                monthlyTotalsMap[monthYear].income += item.amount;
                if (itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear) {
                    monthlyIncome += item.amount;
                }
            }
            else { // Expense
                currentBalance += item.amount; // amount is negative
                const absAmount = Math.abs(item.amount);
                monthlyTotalsMap[monthYear].expense += absAmount;
                if (itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear) {
                    monthlyExpense += absAmount;
                }
                const category = item.subType || item.type || 'Outros';
                categoryTotalsMap[category] = (categoryTotalsMap[category] || 0) + absAmount;
            }
        });
        const categoryTotals = Object.entries(categoryTotalsMap)
            .map(([category, total]) => ({ category, total }));
        // Generate monthly totals for the last 6 months
        const monthlyTotals = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            monthlyTotals.push({
                month: monthKey,
                income: monthlyTotalsMap[monthKey]?.income || 0,
                expense: monthlyTotalsMap[monthKey]?.expense || 0,
            });
        }
        const recentTransactions = items.slice(0, 10);
        return {
            currentBalance,
            monthlyIncome,
            monthlyExpense,
            monthlyTotals,
            categoryTotals,
            recentTransactions,
        };
    }
    // Admin methods
    async getAllTenants() {
        const snap = await this.db.collection('tenants').get();
        return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    }
    async getTenantUsageAnalytics(tenantId) {
        const snap = await this.db.collection(`tenants/${tenantId}/transactions`).count().get();
        const transactionCount = snap.data().count;
        // more analytics can be added here
        return { transactionCount };
    }
    async checkTenantSetup(tenantId) {
        const requiredCollections = ['transactions', 'members'];
        logger_1.logger.info(`Checking setup for tenant ${tenantId}`);
        const checks = await Promise.all(requiredCollections.map(async (col) => {
            const snap = await this.db.collection(`tenants/${tenantId}/${col}`).limit(1).get();
            return { collection: col, exists: !snap.empty };
        }));
        const allOk = checks.every(c => c.exists);
        return { status: allOk ? "ok" : "incomplete", checks };
    }
}
exports.FirestoreAdapter = FirestoreAdapter;
