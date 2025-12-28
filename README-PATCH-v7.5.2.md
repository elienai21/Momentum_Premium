# Momentum v7.5.2 — Build Finalizer Patch (Node 20)

## Substituir
- functions/src/utils/aiClient.ts
- functions/src/utils/google.ts
- functions/src/ai/insights.ts
- functions/src/ai/healthAlerts.ts
- functions/src/ai/advisor.ts
- functions/src/ai/anomalyDetector.ts
- functions/src/ai/goalsAdvisor.ts
- functions/src/ai/supportAgent.ts
- functions/src/ai/chatAgent.ts
- functions/src/modules/billing.ts

## Adicionar
- functions/src/types/express.d.ts   (atualizado com `tenant` e `context`)
- functions/src/types/commandInterpreter.d.ts

## O que corrige
- Erros de import/assinatura (`runGemini`, `runAdvisor`, `processChatMessage`, `handleSupportMessage`, `processHealthAlerts`)
- Tipagem de `req.tenant`/`req.context`
- Google clients legados
- Teste de Billing com fallback em modo `NODE_ENV=test`
- Callbacks com `any` implícito tipados
