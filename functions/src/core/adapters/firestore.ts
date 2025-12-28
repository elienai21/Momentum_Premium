import { db } from "src/services/firebase";



import { RecordItem, Transaction, DashboardData, MonthlyTotal, CategoryTotal, TenantInfo } from "../../types";
import { expandInstallments } from "../logic/installments";
import { logger } from "../../utils/logger";

export class FirestoreAdapter {
  private db = db;
  private tenantId?: string;

  constructor(tenantId?: string) {
    this.tenantId = tenantId;
  }

  private getTenantCollection(collection: string) {
      if (!this.tenantId) {
          throw new Error("Tenant ID is required for this operation.");
      }
      return this.db.collection(`tenants/${this.tenantId}/${collection}`);
  }

  async getRecords(options: { limit?: number; offset?: number }): Promise<{ items: RecordItem[]; total: number }> {
    const query = this.getTenantCollection("transactions").orderBy("date", "desc");
    const snapshot = await query.get();
    const items = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as RecordItem));
    
    const total = items.length;
    const limitedItems = items.slice(options.offset || 0, (options.offset || 0) + (options.limit || total));

    return { items: limitedItems, total };
  }

  async addRecord(userId: string, record: Transaction): Promise<{ count: number; needsReview: boolean; paymentMethod?: string }> {
    const expandedTransactions = await expandInstallments(userId, record);
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

  async updateRecord(id: string, data: Partial<Transaction>): Promise<void> {
    await this.getTenantCollection("transactions").doc(id).update(data);
  }

  async deleteRecord(id: string): Promise<void> {
    await this.getTenantCollection("transactions").doc(id).delete();
  }

  async getDashboardData(): Promise<DashboardData> {
    const { items } = await this.getRecords({ limit: 1000 }); // Increased limit for better monthly aggregation
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let currentBalance = 0;
    let monthlyIncome = 0;
    let monthlyExpense = 0;
    const categoryTotalsMap: { [key: string]: number } = {};
    const monthlyTotalsMap: { [key: string]: { income: number, expense: number } } = {};

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
        } else { // Expense
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
    
    const categoryTotals: CategoryTotal[] = Object.entries(categoryTotalsMap)
        .map(([category, total]) => ({ category, total }));
        
    // Generate monthly totals for the last 6 months
    const monthlyTotals: MonthlyTotal[] = [];
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
  async getAllTenants(): Promise<TenantInfo[]> {
    const snap = await this.db.collection('tenants').get();
    return snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as any));
  }
  
  async getTenantUsageAnalytics(tenantId: string): Promise<any> {
    const snap = await this.db.collection(`tenants/${tenantId}/transactions`).count().get();
    const transactionCount = snap.data().count;
    // more analytics can be added here
    return { transactionCount };
  }

  async checkTenantSetup(tenantId: string): Promise<any> {
      const requiredCollections = ['transactions', 'members'];
      logger.info(`Checking setup for tenant ${tenantId}`);
      const checks = await Promise.all(requiredCollections.map(async col => {
          const snap = await this.db.collection(`tenants/${tenantId}/${col}`).limit(1).get();
          return { collection: col, exists: !snap.empty };
      }));
      const allOk = checks.every(c => c.exists);
      return { status: allOk ? "ok" : "incomplete", checks };
  }
}



