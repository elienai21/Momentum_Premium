---
name: sheets-sync
description: Garantir a sincronização segura de dados entre as planilhas dos clientes e o banco de dados Firestore
---

# Sheets Sync Skill

Esta skill define os padrões e boas práticas para sincronização segura de dados entre planilhas Google Sheets dos clientes e o banco de dados Firestore no Momentum Platform.

---

## 1. Arquitetura de Sincronização

### 1.1 Visão Geral

```
┌─────────────────────────────────────────────────────────────────┐
│                     Google Sheets (Cliente)                     │
│      Planilha com transações financeiras do usuário             │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SheetsAdapter                              │
│           functions/src/core/adapters/sheets.ts                 │
│  - importSheetToFirestore()   ←── Sheets → Firestore            │
│  - exportFirestoreToSheet()   ──→ Firestore → Sheets            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Firestore (Multi-tenant)                     │
│          tenants/{tenantId}/transactions                        │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Arquivos Principais

| Arquivo | Responsabilidade |
|---------|------------------|
| `core/adapters/sheets.ts` | Adapter Google Sheets API (import/export) |
| `core/adapters/firestore.ts` | Adapter Firestore (CRUD de transações) |
| `core/syncManager.ts` | Orquestrador de sync automático |
| `modules/sync.ts` | Rotas HTTP `/sync/import` e `/sync/export` |
| `utils/google.ts` | Cliente Google OAuth e Service Account |

---

## 2. Usando o SheetsAdapter

### 2.1 Modos de Autenticação

```typescript
import { SheetsAdapter } from "../core/adapters/sheets";

// Modo 1: Token do usuário (OAuth - requer consentimento)
const adapterUser = await SheetsAdapter.fromUserToken(googleAccessToken);

// Modo 2: Service Account (server-to-server - background jobs)
const adapterSA = await SheetsAdapter.fromServiceAccount();
```

| Modo | Quando Usar | Requisitos |
|------|-------------|------------|
| **User Token** | Importação/exportação iniciada pelo usuário | Header `x-goog-access-token` |
| **Service Account** | Sync automático em background | SA com acesso à planilha |

### 2.2 Importar Planilha → Firestore

```typescript
const adapter = await SheetsAdapter.fromUserToken(googleAccessToken);

const { importedCount } = await adapter.importSheetToFirestore(
  tenantId,    // ID do tenant no Firestore
  sheetId      // ID da planilha (entre /d/ e / na URL)
);

console.log(`Importadas ${importedCount} transações`);
```

### 2.3 Exportar Firestore → Planilha

```typescript
const adapter = await SheetsAdapter.fromServiceAccount();

const { exportedCount } = await adapter.exportFirestoreToSheet(
  tenantId,
  sheetId
);

console.log(`Exportadas ${exportedCount} transações`);
```

---

## 3. Formato da Planilha

### 3.1 Estrutura Esperada

A planilha deve ter uma aba chamada `Items` com as colunas:

| Coluna | Campo | Exemplo |
|--------|-------|---------|
| A | DATE | 2026-01-15 |
| B | DESCRIPTION | Pagamento cliente XYZ |
| C | NUMERIC_DATA | R$ 1.234,56 |
| D | SUB_TYPE | Consultoria |
| E | TYPE | Income ou Expense |

### 3.2 Validação de Dados

O adapter faz conversões automáticas:

```typescript
// Conversão de valores monetários
"R$ 1.234,56" → 1234.56
"1234,56"     → 1234.56
""            → 0

// Normalização de tipo
"Income"  → "Income"
qualquer outro → "Expense"

// Status automático
status → "paid" (lançamentos importados assumidos como pagos)
```

---

## 4. Segurança

### 4.1 Isolamento Multi-Tenant

> [!IMPORTANT]
> SEMPRE use o `tenantId` correto da request. NUNCA permita que um tenant acesse dados de outro.

```typescript
// ✅ CORRETO - Usa tenant do contexto autenticado
const tenantId = req.tenant.info.id;
await adapter.importSheetToFirestore(tenantId, sheetId);

// ❌ ERRADO - Aceita tenantId do body (vulnerável)
const { tenantId } = req.body; // NÃO FAÇA ISSO!
await adapter.importSheetToFirestore(tenantId, sheetId);
```

### 4.2 Validação de Acesso à Planilha

O acesso à planilha é controlado por:

1. **Token do usuário**: Só funciona se o usuário tem acesso à planilha
2. **Service Account**: Planilha deve estar compartilhada com o SA

```typescript
// Verificar que o tenant pode acessar a planilha
if (!tenant?.sheetId || !tenant.syncEnabled) {
  logger.info(`Skipping sync: not enabled or no sheetId`);
  return;
}
```

### 4.3 Validação de Payload

Sempre valide inputs com Zod:

```typescript
import { z } from "zod";

const importBodySchema = z.object({
  sheetId: z.string().min(3).optional(),
});

// Na rota
const { sheetId } = importBodySchema.parse(req.body ?? {});
```

---

## 5. Rotas de Sincronização

### 5.1 POST /sync/import

Importa dados do Google Sheets para o Firestore.

**Headers Necessários:**
- `Authorization: Bearer {firebaseIdToken}`
- `x-goog-access-token: {googleAccessToken}`

**Body (opcional):**
```json
{
  "sheetId": "1abc123..."
}
```

**Response:**
```json
{
  "ok": true,
  "importedCount": 150
}
```

### 5.2 POST /sync/export

Exporta dados do Firestore para o Google Sheets.

**Headers:** Mesmos do import

**Response:**
```json
{
  "ok": true,
  "exportedCount": 150
}
```

---

## 6. Sync Automático (Background)

### 6.1 Configuração por Tenant

O tenant precisa ter os campos:

```typescript
// Documento do tenant no Firestore
{
  sheetId: "1abc123...",      // ID da planilha
  syncEnabled: true,          // Habilita sync automático
}
```

### 6.2 Usando o SyncManager

```typescript
import { syncSheets } from "../core/syncManager";

// Chamado por um scheduler/trigger
await syncSheets(tenantId);
```

O `syncManager` verifica automaticamente:
- Se o tenant tem `sheetId` configurado
- Se `syncEnabled` está ativo
- Usa Service Account para autenticar

---

## 7. Tratamento de Erros

### 7.1 Erros Comuns

| Erro | Causa | Solução |
|------|-------|---------|
| `Google access token is required` | Header `x-goog-access-token` ausente | Frontend deve enviar token OAuth |
| `Tenant context required` | Middleware de auth não injetou tenant | Verificar middleware `requireAuth` |
| `Sheet has no data to import` | Planilha vazia ou formato incorreto | Verificar aba "Items" e dados |
| `Permission denied` | Token sem acesso à planilha | Usuário deve compartilhar a planilha |

### 7.2 Padrão de Tratamento

```typescript
try {
  const { importedCount } = await adapter.importSheetToFirestore(
    tenantId,
    sheetId
  );
  
  logger.info("Sync import completed", { tenantId, importedCount });
  res.json({ ok: true, importedCount });
  
} catch (e: any) {
  logger.error("Sync import failed", { 
    error: e.message,
    tenantId 
  });
  
  throw new ApiError(500, e.message || "Import error");
}
```

---

## 8. Boas Práticas

### 8.1 Limites e Performance

| Operação | Limite Recomendado |
|----------|-------------------|
| Importação por vez | 500 linhas |
| Exportação por vez | 500 registros |
| Batch do Firestore | 500 operações |

### 8.2 Metadados de Rastreio

Sempre marque registros importados:

```typescript
batch.set(docRef, {
  ...tx,
  importedFromSheet: true,   // Flag de origem
  createdAt: nowIso,         // Timestamp de importação
});
```

### 8.3 Idempotência

Para evitar duplicatas em reimportações:

```typescript
// Opção 1: Limpar antes de importar (destrutivo)
await clearTenantTransactions(tenantId);

// Opção 2: Usar ID estável baseado nos dados
const stableId = hash(`${date}-${description}-${amount}`);
batch.set(collectionRef.doc(stableId), tx, { merge: true });
```

---

## 9. Checklist de Review

Ao revisar PRs com sincronização:

- [ ] Usa `tenantId` do contexto autenticado (não do body)
- [ ] Valida `sheetId` com Zod
- [ ] Verifica existência de token Google quando necessário
- [ ] Trata erros com logging adequado
- [ ] Respeita limites de batch (500)
- [ ] Marca registros com `importedFromSheet: true`
- [ ] Usa adapter correto (UserToken vs ServiceAccount)

---

## 10. Exemplo Completo: Nova Feature de Sync

```typescript
// functions/src/modules/myCustomSync.ts
import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth";
import { SheetsAdapter } from "../core/adapters/sheets";
import { ApiError } from "../utils/errors";
import { logger } from "../utils/logger";

export const myCustomSyncRouter = Router();

const syncSchema = z.object({
  sheetId: z.string().min(10),
  mode: z.enum(["import", "export"]),
});

myCustomSyncRouter.post(
  "/",
  requireAuth as any,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 1. Validar tenant
      if (!req.tenant?.info?.id) {
        throw new ApiError(400, "Tenant context required");
      }
      const tenantId = req.tenant.info.id;

      // 2. Validar token Google
      const googleToken = (req as any).googleAccessToken;
      if (!googleToken) {
        throw new ApiError(400, "Google access token required");
      }

      // 3. Validar payload
      const { sheetId, mode } = syncSchema.parse(req.body);

      // 4. Criar adapter com token do usuário
      const adapter = await SheetsAdapter.fromUserToken(googleToken);

      // 5. Executar operação
      let result;
      if (mode === "import") {
        result = await adapter.importSheetToFirestore(tenantId, sheetId);
        logger.info("Custom sync import", { tenantId, ...result });
      } else {
        result = await adapter.exportFirestoreToSheet(tenantId, sheetId);
        logger.info("Custom sync export", { tenantId, ...result });
      }

      res.json({ ok: true, ...result });

    } catch (e: any) {
      if (e instanceof z.ZodError) {
        return next(new ApiError(400, "Invalid payload"));
      }
      logger.error("Custom sync failed", { error: e.message });
      next(new ApiError(500, e.message));
    }
  }
);
```

---

> [!TIP]
> Use o modo Service Account apenas para operações em background (cron jobs, triggers). Para operações iniciadas pelo usuário, sempre use o token OAuth.

> [!WARNING]
> Nunca armazene o `googleAccessToken` no Firestore. Ele deve ser passado a cada request e é de curta duração.
