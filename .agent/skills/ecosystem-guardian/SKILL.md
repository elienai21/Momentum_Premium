---
name: ecosystem-guardian
description: Garantir a integridade do ecossistema prevenindo regressões de autenticação, mantendo consistência arquitetônica e uniformidade de design.
---

# Ecosystem Guardian Skill

Esta skill atua como um guardião da integridade do ecossistema Momentum, focando em três pilares críticos: Zero Regressão de Autenticação, Consistência Arquitetônica e Uniformidade de Design.

## 1. Zero Regressão de Autenticação

**Objetivo**: Impedir que o erro de header `Authorization` chegue à produção e garantir que todas as chamadas autenticadas propaguem as credenciais corretamente.

### Regras Mandatórias:

1.  **Propagação de Tokens no Frontend**:
    *   Sempre que uma chamada API for feita para o backend (Functions), ela deve incluir o token de autenticação atual.
    *   Utilize os hooks de API existentes (ex: `useApi`, `useFetchUser`) que já tratam a injeção do header `Authorization`.
    *   **Proibido**: Fazer `fetch` direto para endpoints protegidos sem via wrapper autenticado.

2.  **Middleware de Autenticação no Backend**:
    *   Todas as rotas sensíveis ou privadas devem utilizar o middleware `requireAuth`.
    *   Verifique se o `req.user` está sendo populado corretamente antes de acessar dados do tenant.

3.  **Cross-Service Calls**:
    *   Se uma Cloud Function chamar outra, o token deve ser repassado ou uma Service Account apropriada deve ser usada.

4.  **Checklist de Segurança**:
    *   [ ] O endpoint exige autenticação? O middleware está presente?
    *   [ ] O frontend está enviando o token?
    *   [ ] O tratamento de erro 401/403 está implementado (ex: redirect para login)?

## 2. Consistência Arquitetônica

**Objetivo**: Garantir que novas rotas e funções sigam o padrão v2 do Firebase e a região correta.

### Regras Mandatórias:

1.  **Padrão V2 e Região**:
    *   Novas Cloud Functions DEVEM usar a API v2 (`onCall` ou `onRequest` de `firebase-functions/v2`).
    *   **Região Obrigatória**: `southamerica-east1`.
    *   **Exemplo**:
        ```typescript
        import { onRequest } from "firebase-functions/v2/https";
        import { setGlobalOptions } from "firebase-functions/v2";

        setGlobalOptions({ region: "southamerica-east1" });

        export const minhaFuncao = onRequest((req, res) => { ... });
        ```

2.  **Estrutura de Diretórios**:
    *   Mantenha a lógica de negócio separada dos handlers http.
    *   Use `functions/src/modules` para agrupar funcionalidades por domínio.

3.  **Environment Variables**:
    *   Use `defineSecret` ou `defineString` para configurações. Evite hardcoding de chaves ou URLs.

## 3. Uniformidade de Design ("Momentum Theme")

**Objetivo**: Zelar para que novos módulos não fujam do sistema visual "Momentum Theme".

### Regras Mandatórias:

1.  **Tailwind CSS & Design Tokens**:
    *   Use as classes utilitárias do Tailwind configuradas no projeto.
    *   Não crie cores arbitrárias (ex: `text-[#123456]`). Use as cores do tema (ex: `text-primary`, `bg-brand-500`).
    *   Respeite o espaçamento (`p-4`, `m-6`) e tipografia definidos.

2.  **Reuso de Componentes**:
    *   **NUNCA** crie um botão ou input do zero se já existir um componente oficial na biblioteca de UI (`web/src/components/ui` ou similar).
    *   Use `Button`, `Card`, `Input`, `Modal` padronizados para garantir consistência visual e de comportamento.

3.  **Estética Premium**:
    *   Mantenha o padrão visual "clean", com bom uso de whitespace.
    *   Evite interfaces densas ou desorganizadas. Siga os padrões das telas existentes.

4.  **Checklist de UI**:
    *   [ ] O componente usa as cores do tema?
    *   [ ] Os componentes base (botões, inputs) foram reutilizados?
    *   [ ] A responsividade foi testada?

---

> [!IMPORTANT]
> Aja como um revisor chato. Se o código quebrar essas regras, ele deve ser corrigido antes de ser "comitado".
