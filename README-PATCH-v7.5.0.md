# Momentum v7.5.0 — Testes, Observabilidade e Webhook Stripe

## Substituir (overwrite)
- `functions/src/utils/logger.ts`
- `functions/src/index.ts`

## Adicionar
- `functions/src/modules/billingWebhook.ts`
- `functions/jest.config.js`
- `functions/tests/**` (testes com Jest + Supertest)
- `web/src/i18n/strings.json`
- `web/src/hooks/useI18n.ts`
- `.github/workflows/test-deploy.yml`

## Passos
```bash
cd functions
npm i --save-dev jest ts-jest @types/jest supertest
npm run build
npm test

# Deploy (assumindo Firebase token no GitHub Actions para produção)
firebase deploy --only functions,firestore:rules,hosting
```
