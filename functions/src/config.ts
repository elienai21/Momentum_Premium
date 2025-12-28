import { db } from "src/services/firebase";

import { TemplateConfig } from './types';
import { defineSecret, defineString } from 'firebase-functions/params';

// Secret Management - values are injected from Secret Manager at runtime
export const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
export const SENDGRID_API_KEY = defineSecret('SENDGRID_API_KEY');
export const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY');
export const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET');
export const FRONTEND_URL = defineSecret('FRONTEND_URL');
export const SUPPORT_KB_BUCKET = defineSecret('SUPPORT_KB_BUCKET');
export const DEFAULT_PLAN = defineSecret('DEFAULT_PLAN');

// String Parameters - values are configured via `firebase functions:config:set`


export const config = {
    // Security

    // Application Constants
    maxRecordsPerPage: 500,
    platformName: 'Momentum Platform',

    // Template Definitions (Kept for potential future use or data mapping)
    templates: {
        finance: {
            name: 'Financial Tracker',
            label: 'Financeiro',
            SHEETS: {
                RECORDS: 'Items',
                TYPES: 'Types',
                SUMMARY: 'Summary',
                CONFIG: 'Settings',
                HEADERS: {
                    DATE: 0,
                    DESCRIPTION: 1,
                    NUMERIC_DATA: 2,
                    TYPE: 3,
                    SUB_TYPE: 4,
                },
            },
            CONSTANTS: {
                INCOME: 'Income',
                EXPENSE: 'Expense',
            },
        },
    } as { [key: string]: TemplateConfig },
};



