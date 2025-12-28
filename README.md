# Momentum Cloud Platform

This project is a full-stack application built on Firebase, providing a portal for users to manage records stored in Google Sheets. It includes a user-facing portal and an admin panel for client management and analytics.

## Tech Stack

- **Platform:** Firebase (Hosting, Cloud Functions)
- **Backend:** Node.js 20, TypeScript, Express.js
- **Frontend:** HTML, CSS, JavaScript (using Firebase SDK)
- **Database:** Firestore (with optional Google Sheets import/export)
- **Authentication:** Firebase Authentication (Google Sign-In)

## Project Structure
```

momentum-cloud/
├─ functions/ # Backend Cloud Functions
├─ hosting/   # Frontend static files
├─ firebase.json # Firebase project config
└─ .firebaserc   # Firebase project alias

````

## Setup & Deployment

### Prerequisites

1.  Node.js v20 or later
2.  Firebase CLI (`npm install -g firebase-tools`)
3.  A Firebase project
4.  A Google Cloud Platform project with the Google Sheets and Google Drive APIs enabled.

### Line endings
O repositório normaliza finais de linha em **LF** via `.gitattributes`. Em ambientes Windows, configure `git config --global core.autocrlf false` para evitar churn ao commitar.

### API Auth (Cloud Run IAM + Firebase Hosting)
**Regra crítica:** em produção, o frontend **NÃO** deve enviar Firebase ID Token em `Authorization: Bearer ...` para rotas `/api/**` (Cloud Run/IAM usa `Authorization` para validação OIDC do invocador e isso conflita com o token do usuário).

Padrão oficial (browser → Hosting → `/api/**`):
- `x-id-token: <Firebase ID Token do usuário>`
- `x-tenant-id: <tenantId>`
- Sem `Authorization`.

Validação rápida (mesma origem do Hosting):
```bash
curl -i https://SEU_HOSTING.web.app/api/pulse/health \
  -H "x-id-token: $FIREBASE_ID_TOKEN" \
  -H "x-tenant-id: $TENANT_ID"
```
Diagnóstico:
- **IAM/Cloud Run bloqueando**: normalmente retorna **HTML** (403/401) antes de chegar no Express.
- **Middleware do app**: retorna **JSON** (`{ error: ... }`) com status 401/403.

## Baseline Runbook (comercial)

### Rodar baseline local
```bash
npm run verify
```

### Criar e publicar tag de baseline
```bash
git tag baseline/comercial-v1
git push origin baseline/comercial-v1
```

### Voltar para o baseline (rollback/reprodução)
```bash
git checkout baseline/comercial-v1
```

### Branch de release a partir do baseline (opcional)
```bash
git checkout -b baseline/comercial-v1 baseline/comercial-v1
git push -u origin baseline/comercial-v1
```

### Backfill (legado): members sem `status`
Se houver tenants/members antigos sem o campo `status`, o middleware aceita como ativo, mas é recomendado backfill para consistência.

PowerShell (aplica writes):
```powershell
cd functions
npx ts-node scripts/backfillTenantsAndMembers.ts --apply
```

## Runbook de Produção (IAM + Hosting + Cloud Run)

### Objetivo
Manter o **Cloud Run privado** (invoker-only) e permitir chamadas do frontend via **Firebase Hosting** para `/api/**`, sem expor o serviço para `allUsers`.

### Por que NÃO usar `Authorization: Bearer <Firebase ID Token>` no browser
O Cloud Run (IAM) valida `Authorization: Bearer ...` como **OIDC do invocador**. Se o browser enviar um **Firebase ID Token** nesse header, o Cloud Run pode retornar **401 `invalid_token`** antes de a requisição chegar no Express.

Padrão oficial do app (browser → Hosting → `/api/**`):
- `x-id-token: <Firebase ID Token do usuário>`
- `x-tenant-id: <tenantId>`
- **Sem `Authorization`** no browser.

### 1) Criar o Service Identity do Firebase Hosting e obter o e-mail do service agent
PowerShell (requer `gcloud` autenticado no projeto):
```powershell
$PROJECT_ID = "<seu-project-id>"
gcloud services enable firebasehosting.googleapis.com --project $PROJECT_ID
gcloud beta services identity create --service firebasehosting.googleapis.com --project $PROJECT_ID
$PROJECT_NUMBER = gcloud projects describe $PROJECT_ID --format="value(projectNumber)"
$HOSTING_AGENT = "service-$PROJECT_NUMBER@gcp-sa-firebasehosting.iam.gserviceaccount.com"
$HOSTING_AGENT
```

### 2) Conceder `roles/run.invoker` no Cloud Run (apiv2) para o service agent do Hosting
Descubra o nome do serviço (e URL) no mesmo region do deploy:
```powershell
$REGION = "southamerica-east1"
gcloud run services list --region $REGION --project $PROJECT_ID
```
Então aplique o binding (ajuste o nome do serviço se necessário):
```powershell
$SERVICE = "apiV2" # ou o nome real listado acima
gcloud run services add-iam-policy-binding $SERVICE `
  --region $REGION `
  --project $PROJECT_ID `
  --member "serviceAccount:$HOSTING_AGENT" `
  --role "roles/run.invoker"
```

### 3) Diagnóstico rápido: IAM (HTML) vs Express (JSON)
- **Bloqueio IAM/Cloud Run**: resposta **HTML** 401/403 (não chega no Express; sem `traceId` do app).
- **Bloqueio do app (requireAuth/withTenant)**: resposta **JSON** 401/403 (inclui `traceId`).

Testes com `curl`:
```powershell
$HOSTING = "https://momentum-premium.web.app"
$TENANT_ID = "<tenant>"
$FIREBASE_ID_TOKEN = "<id-token>"

# Via Hosting (não usar Authorization)
curl -i "$HOSTING/api/pulse/health" -H "x-id-token: $FIREBASE_ID_TOKEN" -H "x-tenant-id: $TENANT_ID"
```
Opcional (chamada direta ao Cloud Run: precisa de OIDC + x-id-token):
```powershell
$RUN_URL = "https://apiv2-....run.app" # URL do Cloud Run service
$OIDC = gcloud auth print-identity-token --audiences $RUN_URL
curl -i "$RUN_URL/api/pulse/health" -H "Authorization: Bearer $OIDC" -H "x-id-token: $FIREBASE_ID_TOKEN" -H "x-tenant-id: $TENANT_ID"
```

### 4) Garantir que `functions/` não publica `require("src/...")` (tsc-alias pós-tsc)
O build do backend reescreve aliases `src/*` no output `functions/lib/**`.
```powershell
cd functions
npm run build
node ..\\tools\\check-functions-build-aliases.js
```
Se o check falhar, o deploy pode quebrar com `Cannot find module 'src/...'`.

### 5) Baseline “comercial” (tag + branch + rollback)
```powershell
# Verifica baseline local
npm run verify

# Tag e branch do baseline
git tag baseline/comercial-v1
git push origin baseline/comercial-v1
git checkout -b baseline/comercial-v1 baseline/comercial-v1
git push -u origin baseline/comercial-v1

# Rollback/reprodução do baseline
git checkout baseline/comercial-v1
```

### 6) Debug temporário (sem vazar segredos)
O backend suporta log leve de headers (apenas booleanos e tenant) com `REQUEST_DEBUG=true` para correlacionar com `traceId`.
Desligue após validar a produção.

### 7) Troubleshooting IAM: descobrir o principal negado e corrigir sem allUsers
Quando o Cloud Run bloqueia por IAM, normalmente aparece `PERMISSION_DENIED` com `status.code=7` nos logs de `run.googleapis.com`.
Use os logs para identificar o `principalEmail` (quem precisa de `roles/run.invoker`).

```powershell
$PROJECT_ID = "<seu-project-id>"
$REGION = "southamerica-east1"
$SERVICE = "apiV2"

gcloud logging read `
  "resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE AND resource.labels.location=$REGION AND protoPayload.status.code=7" `
  --project $PROJECT_ID `
  --limit 20 `
  --format "table(timestamp, protoPayload.authenticationInfo.principalEmail, protoPayload.status.message)"
```

Depois conceda `roles/run.invoker` ao `principalEmail` correto (service agent do Hosting, SA do CI/CD, etc.):
```powershell
$PRINCIPAL = "<principalEmail>"
gcloud run services add-iam-policy-binding $SERVICE `
  --region $REGION `
  --project $PROJECT_ID `
  --member "serviceAccount:$PRINCIPAL" `
  --role "roles/run.invoker"
```

### Environment Configuration

#### Local Development (Emulators)
1.  Navigate to the `functions/` directory.
2.  Create a `.env` file from the `.env.example` (if one exists). This file is for local testing only.
3.  Populate it with necessary values like Sheet IDs or admin lists for testing.

#### Deployed Environment (Firebase)
This project uses Firebase's Secret Manager integration to handle sensitive API keys and configuration. Before deploying, you must set the required secrets.

Checklist (Stripe em produção):
- Criar produtos e preços no Stripe (Starter/Pro/Enterprise).
- Setar secrets no Firebase Functions:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_PRICE_STARTER`
  - `STRIPE_PRICE_PRO`
  - `STRIPE_PRICE_ENTERPRISE`

Run the following commands from the `functions/` directory for each secret:
```bash
firebase functions:secrets:set GEMINI_API_KEY
# Follow the prompts to enter the secret value.
# Repeat for other secrets like:
# STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SENDGRID_API_KEY, etc.
# STRIPE_PRICE_STARTER, STRIPE_PRICE_PRO, STRIPE_PRICE_ENTERPRISE
````

For non-secret configuration, use `firebase functions:config:set`:

```bash
firebase functions:config:set momentum.admin_sheet_id="YOUR_SHEET_ID"
```

Refer to `functions/src/config.ts` for the full list of required secrets and configuration parameters.

### Local Development

1. **Clone the repository.**
2. **Configure Environment:**

   * Go to the `functions/` directory.
   * Follow the **Environment Configuration** steps above for local development.
3. **Install Dependencies:**

   ```bash
   cd functions
   npm install
   ```
4. **Build TypeScript:**

   ```bash
   npm run build
   ```
5. **Run Emulators:**
   From the root `momentum-cloud/` directory:

   ```bash
   firebase emulators:start
   ```

   The application will be available at `http://localhost:5000`.

### Deployment

1. **Configure Secrets:**

   * Ensure all required secrets for the deployed environment are set using the Firebase CLI as described above.
2. **Build the functions:**

   ```bash
   cd functions
   npm run build
   ```
3. **Deploy to Firebase:**
   From the root `momentum-cloud/` directory:

   ```bash
   firebase deploy
   ```

---

## 🔄 Update: Cloud Functions v2 (apiV2) + New Hosting

The project has been upgraded to **Firebase Cloud Functions (2nd Generation)** using Node.js 20 and a new Express-based entrypoint called **`apiV2`**.
This improves performance, scalability, and integration with Secret Manager.

### 🚀 Deploy the new function

```bash
cd functions
npm run build
firebase deploy --only functions:apiV2
```

### 🌐 Deploy the new landing page

```bash
firebase deploy --only hosting
```

### 📁 Revised Structure

```
/functions/                → backend (apiV2 - Express)
/hosting/public/           → landing and public assets
hosting/public/index.html  → new landing page (tech + human visual)
/hosting/public/momentum-theme.css → global design system
```

### 🔗 Main URLs

* **Landing Page:** [https://momentum-premium.web.app](https://momentum-premium.web.app)
* **API (v2):** [https://apiv2-q3jaf6crea-uc.a.run.app](https://apiv2-q3jaf6crea-uc.a.run.app)
* **Healthcheck:** [https://momentum-premium.web.app/api/pulse/health](https://momentum-premium.web.app/api/pulse/health) (alias disponível em `/api/health`)

### ⚙️ Backend Notes

* Environment variables are managed exclusively through **Firebase Secret Manager**.
* CORS origins are defined in `functions/src/index.ts`.
* Hosting rewrites now route all `/api/**` requests to the new `apiV2` entrypoint.
* The code is compatible with multi-tenant architecture and ready for commercial deployment.

### 🎨 Frontend Notes

* Unified color palette and theme (`momentum-theme.css`).
* Dark/light mode switch built into the landing.
* Consistent branding for all future dashboards and marketing pages.

### 🧠 Next Steps

1. Integrate **Stripe Checkout** and Portal (billing module already scaffolded).
2. Enable monitoring on Cloud Run / Cloud Functions (latency & error metrics).
3. Document onboarding flow for new tenants (`docs/onboarding.md`).
4. Connect the dashboard layout to the global Momentum visual identity.

---

© 2025 Momentum AI Systems — All rights reserved.
