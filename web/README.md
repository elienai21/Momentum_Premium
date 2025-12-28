
# Momentum Web Premium (SPA)

Front-end premium baseado no layout v6.1, convertido para React + Tailwind + Chart.js.
Integração pronta para Firebase Auth e chamadas à API via Bearer token.

## Scripts
```bash
cd web
npm i
npm run dev
npm run build
```

## Integração Firebase
- Edite `src/lib/firebase.ts` com as chaves do seu projeto.
- Use o hook `useAuthToken` para anexar `Authorization: Bearer <token>` nas chamadas da API (`src/lib/api.ts`).

## Deploy no Firebase Hosting
- Aponte `firebase.json` para `"public": "web/dist"`
- Configure rewrites: `{"source": "/api/**", "function": "api"}` e SPA fallback para `index.html`.
