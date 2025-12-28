"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = exports.DEFAULT_PLAN = exports.SUPPORT_KB_BUCKET = exports.FRONTEND_URL = exports.STRIPE_WEBHOOK_SECRET = exports.STRIPE_SECRET_KEY = exports.SENDGRID_API_KEY = exports.GEMINI_API_KEY = void 0;
const params_1 = require("firebase-functions/params");
// Secret Management - values are injected from Secret Manager at runtime
exports.GEMINI_API_KEY = (0, params_1.defineSecret)('GEMINI_API_KEY');
exports.SENDGRID_API_KEY = (0, params_1.defineSecret)('SENDGRID_API_KEY');
exports.STRIPE_SECRET_KEY = (0, params_1.defineSecret)('STRIPE_SECRET_KEY');
exports.STRIPE_WEBHOOK_SECRET = (0, params_1.defineSecret)('STRIPE_WEBHOOK_SECRET');
exports.FRONTEND_URL = (0, params_1.defineSecret)('FRONTEND_URL');
exports.SUPPORT_KB_BUCKET = (0, params_1.defineSecret)('SUPPORT_KB_BUCKET');
exports.DEFAULT_PLAN = (0, params_1.defineSecret)('DEFAULT_PLAN');
// String Parameters - values are configured via `firebase functions:config:set`
exports.config = {
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
    },
};
