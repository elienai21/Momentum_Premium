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
- The repository is driven by the `functions/` and `web/` workspaces; the root `package-lock.json` was removed to avoid accidental `npm ci` at the root. Use per-package installs instead.
- There are no nested clones (e.g., `Momentum_Premium/Momentum_Premium`) detected in this workspace.

## 🧹 Cleanup Plan
1. Keep installs scoped to `functions/` and `web/` (`npm ci --prefix functions`, `npm ci --prefix web`) to avoid recreating a root lockfile.
2. Remove any local temporary files (`firestore-debug.log`, `pubsub-debug.log`) before production commits.
