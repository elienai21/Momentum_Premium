# Momentum v7.5.3 — Clean Build Patch (Node 20+)

## Objetivo
Remover todos os avisos de compilação TypeScript e manter 100% de compatibilidade funcional.

## Substituir
- functions/src/utils/aiClient.ts
- functions/src/utils/google.ts
- functions/src/ai/healthAlerts.ts
- functions/src/modules/support.ts
- functions/src/modules/sync.ts
- functions/src/modules/voice.ts

## Ajustes aplicados
✅ Locale adicionado ao tipo `Meta`  
✅ Parâmetro `authClient` opcional nos Google clients  
✅ `sendHealthAlerts` e `handleSupportMessage` aceitam varargs  
✅ `req.googleAccessToken` tratado com fallback  
✅ `Command.args` tornou-se opcional  
✅ Build totalmente limpo (`tsc` sem erros)

## Rodar após aplicar
```bash
cd functions
npm run build
npm test
```
