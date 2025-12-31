import { db } from "src/services/firebase";
// This file defines application-wide types.
// Global Express Request augmentations are in `express.d.ts`.
import 'express';

export * from "./multi-tenancy";
export * from "./realEstate";


export interface TemplateConfig {
  name: string;
  label: string;
  SHEETS: {
    RECORDS: string;
    TYPES: string;
    SUMMARY: string;
    CONFIG: string;
    HEADERS: {
      [key: string]: number;
    };
  };
  CONSTANTS: {
    [key: string]: string;
  };
}

export interface Client {
  id: string;
  name: string;
  email: string;
  sheetId: string;
  createdAt: string;
  active: boolean;
}

export interface RecordItem {
  id: string; // Typically the row number or UUID
  date: string; // Purchase date
  description: string;
  amount: number;
  type: string;
  subType: string;

  // v6.5 fields
  paymentMethod?: string; // 'Dinheiro', 'Pix', 'Nubank Card'
  status?: 'pending' | 'confirmed' | 'review' | 'paid';
  installment?: {
      number: number;
      total: number;
  };
  dateOfPurchase?: string; // Original date for installments
  dateOfPayment?: string;  // Actual due date for this specific record
}

export interface Transaction {
  description: string;
  amount: number;
  category: string;
  type: "Income" | "Expense" | "";
  
  // v6.5 fields
  date?: string; // Date of purchase
  installments?: number;
  paymentMethod?: string;
}

export interface MonthlyTotal {
  month: string;
  income: number;
  expense: number;
}

export interface CategoryTotal {
  category: string;
  total: number;
}

export interface DashboardData {
  currentBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  monthlyTotals: MonthlyTotal[];
  categoryTotals: CategoryTotal[];
  recentTransactions: RecordItem[];
}

// v4.6 Types
export interface AiInsight {
  title?: string;
  message: string;
  confidence?: number;
}

export interface AiLog {
  userId: string;
  module: "support" | "insights" | "brain";
  message: string;
  createdAt: string;
}

export interface AlertEmail {
  subject: string;
  body: string;
}

// v4.8 Types
export interface Goal {
    name: string;
    targetAmount: number;
    currentAmount: number;
    targetDate: string;
}

export interface Forecast {
    forecast: {
        "30d": number;
        "60d": number;
        "90d": number;
    };
    insights: string[];
}

// v5.1 Types
export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

// v6.5 Types
export interface CardProfile {
  id?: string;
  name: string;
  closingDay: number; // 1-31
  dueDay: number;     // 1-31
  brand?: 'visa' | 'mastercard' | 'amex' | 'elo' | 'other';
  limit?: number;
  tenantId: string;
  userId: string;
}

// v7.1 Types
export interface Account {
  id: string;
  type: "payable" | "receivable";
  description: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  status: "pending" | "under_review" | "paid" | "overdue";
  paidAt?: string | null;
  method?: string;
  reference?: string;
  createdAt: string;
  reviewedBy?: string | null;
  approvedBy?: string | null;
  dualValidation: boolean;
  notes?: string | null;
}

