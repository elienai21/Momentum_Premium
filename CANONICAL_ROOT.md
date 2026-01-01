# Canonical Root: Momentum Premium

This document defines the official root and structure for the Momentum Premium monorepo.

## 📍 Root Path
`c:\Projetos\Momentum_firebase_Premium\Momentum_Premium`

## 📂 Structure
- `functions/`: Firebase Functions v2 (Node 20). Region: `southamerica-east1`.
- `web/`: Frontend React + Vite. Deploy source for Hosting.
- `hosting/public/`: Static assets directory for Firebase Hosting (Vite build output).

## 🚀 Build & Deploy Scripts (Root)
- `npm run build:all`: Builds both `functions` and `web`.
- `npm run deploy`: Executes `firebase deploy --only functions,hosting`.
- `npm run build:web`: Specific wrapper for frontend build with Windows compatibility (`npm.cmd`).

## ⚠️ Integrity & Duplicities
- The root `package-lock.json` must be kept in sync with the root `package.json`.
- There are no nested clones (e.g., `Momentum_Premium/Momentum_Premium`) detected in this workspace.

## 🧹 Cleanup Plan
1. Ensure root `package-lock.json` is updated to include `compression` and other missing dependencies causing `npm ci` failures.
2. Remove any local temporary files (`firestore-debug.log`, `pubsub-debug.log`) before production commits.
