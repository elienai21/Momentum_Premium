# Momentum v7.5.1 — Full Stability Patch (Node 20)

## Substituir (overwrite)
- `functions/src/utils/logger.ts`
- `functions/src/ai/insights.ts`
- `functions/src/ai/advisor.ts`
- `functions/src/ai/chatAgent.ts`
- `functions/src/ai/healthAlerts.ts`
- `functions/src/ai/supportAgent.ts`
- `functions/src/billing/billing.ts`
- `functions/src/modules/billing.ts`
- `functions/src/utils/aiClient.ts`
- `functions/src/utils/usageTracker.ts`
- `functions/src/utils/google.ts`
- `functions/jest.config.js`
- `functions/tests/utils.test.ts`

## Adicionar
- `functions/src/types/express.d.ts`
- `web/src/i18n/strings.json`
- `web/src/hooks/useI18n.ts`
- `web/README_FRONTEND.md`

## Dependências recomendadas
```bash
cd functions
npm i stripe@14.21.0 googleapis@127 @types/supertest --save-dev
```

## Rodar
```bash
cd functions
npm run build
npm test    # E2E ignorados automaticamente
```

## Deploy
```bash
firebase deploy --only functions,firestore:rules,hosting
```
