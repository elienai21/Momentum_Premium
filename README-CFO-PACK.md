
# Momentum CFO Pack (v1)

Funcionalidades:
- Memory Engine (perfil financeiro dinâmico)
- Action Engine (plano de ações recomendado)
- Scenario Simulator
- Health Score
- Benchmarks (mock)
- Advisor Context
- Rotas: `/api/cfo/*`
- UI: `/cfo-dashboard.html`

## Instalação
1. Copie os arquivos para:
```
functions/src/cfo/*.ts
functions/src/modules/cfo.ts
functions/src/scheduler/cfoCron.ts
hosting/public/cfo-dashboard.html
hosting/public/scripts/cfo.js
```

2. No `functions/src/index.ts`:
```ts
import { cfoRouter } from './modules/cfo';
app.use('/api/cfo', requireAuth as any, withTenant as any, cfoRouter);
export { cfoNightly } from './scheduler/cfoCron';
```

3. Build/test/deploy:
```bash
cd functions
npm run build
npm test
firebase deploy --only functions,hosting
```
