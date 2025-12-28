# Baseline de Regressão

- Tag do baseline: `baseline/comercial-v1` (ajuste conforme a tag oficial criada no repositório).
- Commit SHA imutável do baseline: `<preencher-com-o-SHA-da-tag>`.
- Política de branches: `main` protegida; todo merge deve passar pelo CI e preservar a integridade do baseline. Branches de trabalho devem sair de `main` ou de uma tag de baseline.

## Validação oficial (local/CI)

Executa todas as verificações esperadas pelo CI:

```bash
npm run ci:all
```

Fluxo detalhado do `ci:all`:

```bash
# Cloud Functions
cd functions
npm ci
npm run lint:imports
npm run build
npm run test -- --runInBand --detectOpenHandles

# Frontend web
cd ../web
npm ci
npm run build
```

### Verificação de alias TypeScript no build (Functions)
O build de `functions/` reescreve imports `src/*` para paths relativos no output `lib/` usando `tsc-alias`. Para confirmar:

```bash
cd functions
npm run build
Get-ChildItem -Recurse lib -Filter *.js | Select-String -Pattern ([regex]::Escape('require("src/')) 
```

## Guardrails de line endings

O repositório normaliza finais de linha em **LF** via `.gitattributes` para evitar churn em máquinas Windows. Se necessário, execute `git config core.autocrlf false` localmente antes de commitar.

## Atualização do baseline

1. Abra uma branch a partir de `main`.
2. Rode `npm run ci:all` e resolva qualquer falha.
3. Gere uma nova tag de baseline (`vX.Y.Z-baseline`) apontando para o commit aprovado.
4. Registre a nova tag e SHA neste arquivo.
