---
name: ai-adapters
description: Garantir que novos recursos de IA utilizem os adaptadores corretos e mantenham a consistência do sistema de prompts
---

# AI Adapters & Prompt Consistency Skill

Esta skill define os padrões e boas práticas para integração de novos recursos de IA no Momentum Platform, garantindo uso correto dos adaptadores e consistência no sistema de prompts.

---

## 1. Arquitetura de IA do Projeto

### 1.1 Visão Geral

```
┌─────────────────────────────────────────────────────────────────┐
│                       Consumidores de IA                        │
│  (CFO Reports, Receipt OCR, Chat, Health Score, Insights...)   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      aiClient (Unified)                         │
│           functions/src/utils/aiClient.ts                       │
│  - Provider resolution (OpenAI/Gemini via env ou meta)         │
│  - System prompt building                                       │
│  - Usage tracking                                               │
│  - Logging & observability                                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                              ▼
┌─────────────────────┐         ┌─────────────────────┐
│   OpenAI Provider   │         │   Gemini Provider   │
│   callOpenAI()      │         │   callGemini()      │
└─────────────────────┘         └─────────────────────┘
```

### 1.2 Arquivos Principais

| Arquivo | Responsabilidade |
|---------|------------------|
| `functions/src/utils/aiClient.ts` | **Cliente unificado** - Ponto central para todas chamadas de IA |
| `functions/src/config/prompts.ts` | **Sistema de prompts** - Templates por vertical e kind |
| `functions/src/types/ai.ts` | **Tipos TypeScript** - Interfaces para requests/responses |
| `functions/src/core/aiCache.ts` | **Cache de IA** - Evita chamadas repetidas |
| `functions/src/middleware/withSecrets.ts` | **Secrets** - Chaves de API (OPENAI_KEY, GEMINI_KEY) |

---

## 2. Como Integrar Novos Recursos de IA

### 2.1 Regra de Ouro
> [!IMPORTANT]
> **SEMPRE** use o `aiClient()` de `utils/aiClient.ts`. **NUNCA** faça chamadas diretas às APIs OpenAI/Gemini.

### 2.2 Padrão de Chamada

```typescript
import { aiClient, Meta, AiResult } from "../utils/aiClient";

async function myNewAiFeature(tenantId: string, userId: string): Promise<string> {
  const prompt = buildMyPrompt(/* seus dados */);

  const meta: Meta = {
    tenantId,                    // OBRIGATÓRIO: contexto de tenant
    userId,                      // Opcional: contexto de usuário
    model: "gemini",             // Preferência: "gemini" | "openai"
    promptKind: "my_feature",    // Identificador único do tipo de prompt
    locale: "pt-BR",             // Locale para respostas
  };

  const result: AiResult = await aiClient(prompt, meta);

  return result.text;
}
```

### 2.3 Checklist para Novo Recurso de IA

- [ ] Usa `aiClient()` de `utils/aiClient.ts`
- [ ] Define `promptKind` único e descritivo
- [ ] Passa `tenantId` obrigatório no meta
- [ ] Define locale apropriado (`pt-BR` ou `en-US`)
- [ ] Trata erros adequadamente (try/catch com logging)
- [ ] Considera usar `getOrSetCache()` para respostas cacheable

---

## 3. Sistema de Prompts

### 3.1 Estrutura de Prompts por Vertical

O sistema suporta prompts customizados por **vertical** (finance, real_estate, condos) e **kind** (insights, support, forecast, chat, voice):

```typescript
// functions/src/config/prompts.ts
import { getPrompt } from "../config/prompts";

// Busca prompt do Firestore ou usa fallback local
const systemPrompt = await getPrompt("finance", "insights");
```

### 3.2 Tipos de Prompt Suportados

| Kind | Uso | Exemplo |
|------|-----|---------|
| `insights` | Análises financeiras e recomendações | Dashboard insights |
| `support` | Respostas de suporte ao usuário | Help desk |
| `forecast` | Projeções de fluxo de caixa | Cash flow prediction |
| `chat` | Conversação interativa | CFO Chat |
| `voice` | Respostas para assistente de voz | Voice commands |

### 3.3 Adicionando Novo Tipo de Prompt

1. **Adicionar fallback local** em `prompts.ts`:
```typescript
const fallbackPrompts = {
  finance: {
    // ... existentes
    my_new_kind: "You are a specialized assistant for X...",
  },
  // repetir para outras verticals...
};
```

2. **Atualizar assinatura** da função `getPrompt`:
```typescript
export async function getPrompt(
  vertical: VerticalId,
  kind: 'insights' | 'support' | 'forecast' | 'chat' | 'voice' | 'my_new_kind'
): Promise<string>
```

3. **Configurar no Firestore** (opcional, para overrides):
```
Collection: prompts
Document: finance
Fields: { my_new_kind: "Custom prompt text..." }
```

---

## 4. Resolução de Provider e Model

### 4.1 Hierarquia de Resolução

O `aiClient` resolve o provider nesta ordem:

1. **Variável de ambiente `AI_PROVIDER`** (força global)
2. **`meta.model`** passado na chamada
3. **Fallback**: `"openai"`

### 4.2 Resolução de Modelo Específico

```typescript
// Variável AI_MODEL_DEFAULT define modelo global
// Ou usa defaults por provider:
// - OpenAI: "gpt-4o-mini"
// - Gemini: "gemini-1.5-flash"
```

### 4.3 Resolução por Plano (Exemplo: CFO Report)

```typescript
// functions/src/cfo/aiReport.ts
function resolveTextModelForPlan(plan: PlanTier): "gemini" | "openai" {
  switch (plan) {
    case "cfo":
      return "gemini"; // Pode ser "openai" para mais capacidade
    default:
      return "gemini";
  }
}
```

---

## 5. Padrões de Prompt Engineering

### 5.1 Estrutura Recomendada

```typescript
function buildMyPrompt(data: any): string {
  return `
## Contexto
[Descrição do papel da IA e contexto do negócio]

## Instruções
1. [Instrução clara e específica]
2. [Outra instrução]
3. [Restrições e guardrails]

## Dados
${JSON.stringify(data, null, 2)}

## Formato de Resposta
[Especificar formato esperado: JSON, texto corrido, bullet points, etc.]
`.trim();
}
```

### 5.2 Boas Práticas

| Prática | Exemplo |
|---------|---------|
| **Seja específico** | "Responda em português brasileiro" vs "Responda no idioma apropriado" |
| **Defina guardrails** | "Não invente números que não estejam nos dados" |
| **Limite extensão** | "Use no máximo 800 palavras" |
| **Especifique formato** | "Responda apenas com o JSON, sem explicações adicionais" |
| **Inclua contexto** | Forneça dados relevantes do tenant no prompt |

### 5.3 Anti-Padrões (Evitar)

```typescript
// ❌ ERRADO: Prompt vago
const prompt = "Analise isso e me dê insights";

// ✅ CORRETO: Prompt estruturado
const prompt = `
Você é um analista financeiro. Analise os dados de despesas abaixo e:
1. Identifique as 3 categorias com maior gasto
2. Compare com a média do período anterior
3. Sugira 2 ações práticas de economia

Dados: ${JSON.stringify(expenses)}

Responda em formato JSON com keys: topCategories, comparison, suggestions
`;
```

---

## 6. Cache de Respostas

### 6.1 Quando Usar Cache

- ✅ Relatórios que não mudam frequentemente
- ✅ Insights baseados em dados históricos
- ✅ Análises que não precisam de dados real-time
- ❌ Conversações interativas (chat)
- ❌ Respostas baseadas em dados que mudam constantemente

### 6.2 Implementação

```typescript
import { getOrSetCache } from "../core/aiCache";

const result = await getOrSetCache(
  `cfo_report_${tenantId}_${periodDays}`, // chave única
  async () => await generateExpensiveAiReport(tenantId), // função geradora
  6 // TTL em horas
);
```

---

## 7. Logging e Observabilidade

### 7.1 O que o aiClient Loga Automaticamente

| Evento | Campos Logados |
|--------|----------------|
| **Sucesso** | tenantId, userId, provider, model, promptKind, latency, totalTokenCount |
| **Erro** | tenantId, userId, provider, model, promptKind, latency, error message |

### 7.2 Tracking de Uso

O `aiClient` chama automaticamente `trackUsage()` para contabilizar tokens por tenant/provider.

---

## 8. Tratamento de Erros

### 8.1 Erros Comuns

| Erro | Causa | Solução |
|------|-------|---------|
| `OPENAI_API_KEY is not configured` | Secret não definido | Configurar no Secret Manager |
| `GEMINI_API_KEY is not configured` | Secret não definido | Configurar no Secret Manager |
| `API error: 429` | Rate limit | Implementar retry com backoff |
| `API error: 401` | Chave inválida | Renovar API key |

### 8.2 Padrão de Tratamento

```typescript
try {
  const result = await aiClient(prompt, meta);
  return result.text;
} catch (error: any) {
  logger.error("AI feature failed", {
    tenantId: meta.tenantId,
    feature: "my_feature",
    error: error?.message,
  });
  
  // Retornar fallback ou propagar erro
  throw new ApiError(502, "AI service temporarily unavailable");
}
```

---

## 9. Exemplo Completo: Novo Recurso de IA

```typescript
// functions/src/services/myNewAiService.ts
import { aiClient, Meta, AiResult } from "../utils/aiClient";
import { getOrSetCache } from "../core/aiCache";
import { logger } from "../utils/logger";
import { ApiError } from "../utils/errors";

interface MyAnalysisInput {
  tenantId: string;
  userId?: string;
  data: Record<string, any>;
}

interface MyAnalysisResult {
  analysis: string;
  confidence: number;
}

function buildAnalysisPrompt(data: Record<string, any>): string {
  return `
Você é um analista especializado. Analise os dados a seguir e forneça insights acionáveis.

## Dados
${JSON.stringify(data, null, 2)}

## Instruções
1. Identifique padrões relevantes
2. Destaque anomalias
3. Sugira próximos passos

Responda em português brasileiro, de forma clara e objetiva.
`.trim();
}

export async function performMyAnalysis(
  input: MyAnalysisInput
): Promise<MyAnalysisResult> {
  const { tenantId, userId, data } = input;

  // Usar cache para evitar chamadas repetidas
  const cacheKey = `my_analysis_${tenantId}_${JSON.stringify(data).slice(0, 50)}`;

  return getOrSetCache(cacheKey, async () => {
    const prompt = buildAnalysisPrompt(data);

    const meta: Meta = {
      tenantId,
      userId,
      model: "gemini",
      promptKind: "my_custom_analysis",
      locale: "pt-BR",
    };

    try {
      const result = await aiClient(prompt, meta);

      return {
        analysis: result.text,
        confidence: 0.85,
      };
    } catch (error: any) {
      logger.error("My analysis failed", { tenantId, error: error?.message });
      throw new ApiError(502, "Analysis service unavailable");
    }
  }, 2); // Cache por 2 horas
}
```

---

## 10. Checklist de Review

Ao revisar PRs com novos recursos de IA:

- [ ] Usa `aiClient()` centralizado
- [ ] Define `promptKind` único
- [ ] Passa `tenantId` no meta
- [ ] Prompt é claro e estruturado
- [ ] Tem tratamento de erros adequado
- [ ] Considera cache quando apropriado
- [ ] Não faz chamadas diretas às APIs
- [ ] Logging adequado em erro

---

> [!TIP]
> Use `promptKind` como identificador para análise de custos por funcionalidade nos logs de uso.

> [!WARNING]
> Nunca exponha respostas de IA diretamente ao usuário sem sanitização. Sempre valide o formato esperado.
