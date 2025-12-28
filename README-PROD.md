# Momentum Platform - Production Operations Guide

This document provides essential information for operating and maintaining the Momentum Platform in a production environment.

## 1. Architecture Overview

- **Platform:** Firebase (Hosting, Cloud Functions v2, Firestore)
- **Backend:** Node.js 20, TypeScript, Express.js
- **Frontend:** HTML, CSS, JavaScript (Vanilla)
- **Database:** Firestore (multi-tenant)
- **Authentication:** Firebase Authentication

The system is designed as a serverless, multi-tenant SaaS application.

## 2. Key AI Modules

- **Health Suite (`ai/healthScore`, `ai/healthRanking`):** Calculates daily financial health scores for tenants and generates an admin-only ranking.
- **AI Advisor (`ai/advisor`):** Proactively analyzes tenant data to generate predictive insights and recommendations.
- **Conversational AI (`ai/chatAgent`, `ai/commandInterpreter`):** Powers the text and voice assistants, using Gemini models for natural language understanding and function calling.

## 3. Main API Routes

- `/api/portal`: Core endpoints for the user dashboard (records, analytics).
- `/api/admin`: Endpoints for platform administrators (client lists, global analytics).
- `/api/ai`: Endpoints for AI-driven features (insights, forecasts).
- `/stripeWebhook`: Handles billing events from Stripe.

All sensitive endpoints are protected by authentication and tenant-scoping middleware.

## 4. Observability & Auditing

- **Logging:** All backend logs are sent to Google Cloud Logging. They are structured as JSON and include a `traceId` and `tenantId` for easy filtering and request tracing.
- **AI Audit Trail:** Every call to an AI model is logged to the `ai_logs` collection in Firestore, capturing metadata, performance, and status.
- **User Actions:** Critical user and admin actions (e.g., creating an account, deleting a card) are logged to the `audit_logs` collection.

## 5. Deployment Notes

1.  **Build:** Run `npm run build` from the `functions/` directory.
2.  **Secrets:** Ensure all necessary secrets (`GEMINI_API_KEY`, `STRIPE_SECRET_KEY`, etc.) are set in the GCP Secret Manager and accessible by the functions.
3.  **Deploy:** From the project root, run `firebase deploy --only functions,hosting`.
4.  **Scheduler:** Manually configure Cloud Scheduler jobs to trigger the HTTP endpoints for `dailyAiMaintenance` and `advisorScheduler`.

## 6. Rollback Procedure

To roll back a deployment, navigate to the Google Cloud Console for Cloud Functions, select the function you wish to roll back, and redeploy a previous, stable version from the source code history. For hosting, use the Firebase Hosting console to revert to a previous release version.
