# Backfill: Tenants (plan/planId) e Membership (status/email)

Script manual para corrigir dados legados em Firestore. **DRY RUN é o padrão**; só aplica mudanças com `APPLY=true`.

## Arquivo
- `functions/scripts/backfillTenantsAndMembers.ts`

## Flags / variáveis
- `APPLY=true` ou `--apply` para aplicar (default é dry run)
- `TENANT_ID=<id>` para limitar a um tenant
- `LIMIT_TENANTS=<n>` (default 500) limite de tenants processados
- `LIMIT_MEMBERS_PER_TENANT=<n>` (default 500) limite de membros por tenant
- `FETCH_AUTH_EMAIL=true` para buscar email via Admin Auth (default false)

## Como rodar (local)
Pré-requisitos: Node 20, credenciais com acesso (ex.: `GOOGLE_APPLICATION_CREDENTIALS` apontando para service account com permissão em Firestore/Auth).

### DRY RUN em todos
```bash
cd functions
npx ts-node scripts/backfillTenantsAndMembers.ts
```

### APPLY em tenant específico
```bash
cd functions
APPLY=true TENANT_ID=my-tenant-123 npx ts-node scripts/backfillTenantsAndMembers.ts
```

### APPLY com LIMIT e fetch de email no Auth
```bash
cd functions
APPLY=true LIMIT_TENANTS=200 LIMIT_MEMBERS_PER_TENANT=300 FETCH_AUTH_EMAIL=true npx ts-node scripts/backfillTenantsAndMembers.ts
```

> Rodar fora do horário de pico e revisar logs antes de APPLY.

## O que o script faz
1) Tenants:
   - Se `plan` faltando e `planId` presente → seta `plan = planId` (+ `updatedAt`).
   - Se `planId` faltando e `plan` presente → seta `planId = plan` (+ `updatedAt`).
   - Se `plan` e `planId` divergem → loga WARNING, não muda.
2) Members em cada tenant:
   - Se `status` faltando e (uid == ownerUid OU role == "admin") → seta `status = "active"`.
   - Se `email` faltando e `FETCH_AUTH_EMAIL=true` → tenta `admin.auth().getUser(uid)` e grava email.
   - Sempre usa `merge:true`, adiciona `updatedAt`. Batch commit em blocos.
3) Respeita `LIMIT` e `TENANT_ID` quando informados.

## Saída esperada (exemplo DRY RUN)
```
[START] backfillTenantsAndMembers { dryRun: true, apply: false, limit: 500, ... }
[WARN] plan diverge, no change { tenantId: "t-123", plan: "pro", planId: "starter" }
[SUMMARY] { scannedTenants: 42, updatedTenants: 10, scannedMembers: 180, updatedMembers: 25, errors: 0 }
[EXAMPLES] [ { tenantId: "t-abc", tenantUpdates: { plan: "starter" } }, { tenantId: "t-abc", memberId: "u-1", updates: { status: "active" } } ]
[DONE] DRY RUN (no writes performed)
```

## Checklist de validação
- Rodar DRY RUN e revisar WARNINGS (divergência plan/planId).
- Rodar APPLY em 1 tenant de teste.
- Validar endpoints:
  - `/api/pulse/health` (200)
  - `/api/cfo/health` (se plano premium, esperar 200; se free, 403 upgrade)
- Confirmar que tenant premium não cai como “free” após backfill.
- Confirmar membership `status: "active"` para owner/admin onde devido.
