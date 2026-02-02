---
name: production-ops
description: Garantir que o ambiente de produção esteja estável e que as variáveis sensíveis estejam configuradas corretamente no Secret Manager
---

# Production Operations & Secret Manager Skill

Esta skill fornece instruções detalhadas para garantir a estabilidade do ambiente de produção do Momentum Platform e a correta configuração de variáveis sensíveis no Google Cloud Secret Manager.

---

## 1. Secrets Obrigatórios

Os seguintes secrets **DEVEM** estar configurados no Secret Manager para que o ambiente funcione corretamente:

### Secrets de AI/ML
| Secret Name | Descrição | Obrigatório |
|-------------|-----------|-------------|
| `OPENAI_API_KEY` | Chave da API OpenAI para funcionalidades de IA | ✅ |
| `GEMINI_API_KEY` | Chave da API Google Gemini para análises | ✅ |

### Secrets de Billing (Stripe)
| Secret Name | Descrição | Obrigatório |
|-------------|-----------|-------------|
| `STRIPE_API_KEY` | Chave pública do Stripe | ✅ |
| `STRIPE_SECRET_KEY` | Chave secreta do Stripe | ✅ |
| `STRIPE_WEBHOOK_SECRET` | Secret para validar webhooks | ✅ |
| `STRIPE_PRICE_STARTER` | ID do preço plano Starter | ✅ |
| `STRIPE_PRICE_PRO` | ID do preço plano Pro | ✅ |
| `STRIPE_PRICE_ENTERPRISE` | ID do preço plano Enterprise | ✅ |

### Secrets de Email
| Secret Name | Descrição | Obrigatório |
|-------------|-----------|-------------|
| `SENDGRID_API_KEY` | Chave da API SendGrid | ✅ |

### Secrets de Aplicação
| Secret Name | Descrição | Obrigatório |
|-------------|-----------|-------------|
| `FRONTEND_URL` | URL do frontend (ex: https://app.momentum.com) | ✅ |
| `SUPPORT_KB_BUCKET` | Bucket GCS para Knowledge Base | ⚠️ Opcional |
| `DEFAULT_PLAN` | Plano default para novos tenants | ⚠️ Opcional |

---

## 2. Verificação de Secrets

### 2.1 Listar Secrets Configurados
```bash
# Listar todos os secrets do projeto
gcloud secrets list --project=YOUR_PROJECT_ID

# Verificar se um secret específico existe
gcloud secrets describe OPENAI_API_KEY --project=YOUR_PROJECT_ID
```

### 2.2 Verificar Acesso das Cloud Functions
```bash
# Verificar qual service account as functions usam
gcloud functions describe api --region=us-central1 --format="value(serviceAccountEmail)"

# Verificar permissões do service account
gcloud projects get-iam-policy YOUR_PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:YOUR_SA@YOUR_PROJECT.iam.gserviceaccount.com" \
  --format="table(bindings.role)"
```

### 2.3 Script de Validação Completa
```bash
#!/bin/bash
# production-secrets-check.sh

PROJECT_ID="YOUR_PROJECT_ID"
REQUIRED_SECRETS=(
  "OPENAI_API_KEY"
  "GEMINI_API_KEY"
  "STRIPE_API_KEY"
  "STRIPE_SECRET_KEY"
  "STRIPE_WEBHOOK_SECRET"
  "STRIPE_PRICE_STARTER"
  "STRIPE_PRICE_PRO"
  "STRIPE_PRICE_ENTERPRISE"
  "SENDGRID_API_KEY"
  "FRONTEND_URL"
)

echo "🔐 Verificando secrets obrigatórios..."
echo "======================================="

MISSING=0
for secret in "${REQUIRED_SECRETS[@]}"; do
  if gcloud secrets describe "$secret" --project="$PROJECT_ID" &>/dev/null; then
    VERSION=$(gcloud secrets versions list "$secret" --project="$PROJECT_ID" --limit=1 --format="value(name)" 2>/dev/null)
    if [ -n "$VERSION" ]; then
      echo "✅ $secret (versão: $VERSION)"
    else
      echo "⚠️  $secret existe mas sem versão ativa"
      MISSING=$((MISSING + 1))
    fi
  else
    echo "❌ $secret NÃO ENCONTRADO"
    MISSING=$((MISSING + 1))
  fi
done

echo ""
if [ $MISSING -eq 0 ]; then
  echo "🎉 Todos os secrets obrigatórios estão configurados!"
else
  echo "⚠️  $MISSING secret(s) faltando ou inválido(s)"
  exit 1
fi
```

---

## 3. Configuração de Secrets

### 3.1 Criar um Novo Secret
```bash
# Criar secret com valor inline
echo -n "sk-your-api-key" | gcloud secrets create OPENAI_API_KEY \
  --data-file=- \
  --project=YOUR_PROJECT_ID

# Criar secret a partir de arquivo
gcloud secrets create STRIPE_SECRET_KEY \
  --data-file=./stripe-key.txt \
  --project=YOUR_PROJECT_ID
```

### 3.2 Atualizar Valor de um Secret
```bash
# Adicionar nova versão
echo -n "new-api-key-value" | gcloud secrets versions add OPENAI_API_KEY \
  --data-file=- \
  --project=YOUR_PROJECT_ID

# Desabilitar versão antiga (opcional)
gcloud secrets versions disable 1 --secret=OPENAI_API_KEY --project=YOUR_PROJECT_ID
```

### 3.3 Conceder Acesso às Cloud Functions
```bash
# Obter service account das functions
SA_EMAIL=$(gcloud functions describe api --region=us-central1 --format="value(serviceAccountEmail)")

# Conceder acesso a um secret específico
gcloud secrets add-iam-policy-binding OPENAI_API_KEY \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/secretmanager.secretAccessor" \
  --project=YOUR_PROJECT_ID
```

---

## 4. Verificação de Estabilidade do Ambiente

### 4.1 Health Check das Cloud Functions
```bash
# Listar status de todas as functions
gcloud functions list --project=YOUR_PROJECT_ID --format="table(name,status,runtime)"

# Verificar logs recentes de erros
gcloud functions logs read api --project=YOUR_PROJECT_ID \
  --limit=50 \
  --filter="severity>=ERROR"
```

### 4.2 Verificar Conectividade dos Serviços
```bash
# Testar endpoint principal
curl -s -o /dev/null -w "%{http_code}" https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/api/health

# Verificar Firestore
gcloud firestore databases list --project=YOUR_PROJECT_ID
```

### 4.3 Checklist Pré-Deploy
Antes de cada deploy em produção, verifique:

- [ ] **Secrets**: Todos os secrets obrigatórios existem e têm versões ativas
- [ ] **IAM**: Service account tem `secretmanager.secretAccessor` em todos os secrets
- [ ] **Firestore Rules**: Regras de segurança deployadas e testadas
- [ ] **Indexes**: Todos os índices necessários estão criados em `firestore.indexes.json`
- [ ] **Build**: `npm run build` passa sem erros em `/functions`
- [ ] **Tests**: `npm test` passa sem falhas críticas
- [ ] **Environment**: Variáveis de ambiente do Firebase configuradas

---

## 5. Troubleshooting

### 5.1 Erro: "Permission denied on secret"
```bash
# Verificar permissões
gcloud secrets get-iam-policy SECRET_NAME --project=YOUR_PROJECT_ID

# Adicionar permissão
gcloud secrets add-iam-policy-binding SECRET_NAME \
  --member="serviceAccount:YOUR_SA@YOUR_PROJECT.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 5.2 Erro: "Secret not found"
Verifique se o nome do secret corresponde exatamente ao definido no código:
- `functions/src/middleware/withSecrets.ts`
- `functions/src/config.ts`
- `functions/src/config/index.ts`

### 5.3 Erro: "Functions failed to deploy"
```bash
# Ver logs detalhados de deploy
gcloud functions deploy api --project=YOUR_PROJECT_ID --verbosity=debug

# Verificar quotas
gcloud compute project-info describe --project=YOUR_PROJECT_ID
```

---

## 6. Arquivos Relevantes no Projeto

| Arquivo | Descrição |
|---------|-----------|
| `functions/src/middleware/withSecrets.ts` | Define secrets exportados para functions |
| `functions/src/config.ts` | Configuração central com secrets e parâmetros |
| `functions/src/config/index.ts` | Índice de configurações |
| `functions/src/billing/subscriptionManager.ts` | Secrets do Stripe para subscriptions |
| `functions/src/billing/stripeBilling.ts` | Secrets de preços do Stripe |

---

## 7. Monitoramento Contínuo

### 7.1 Alertas Recomendados
Configure alertas no Cloud Monitoring para:
- Erros de acesso a secrets (logs com "Permission denied" ou "Secret not found")
- Functions com status diferente de ACTIVE
- Taxa de erro > 5% nas Cloud Functions
- Latência > 3s no endpoint /api/health

### 7.2 Dashboard de Produção
Acesse o Firebase Console para monitorar:
- **Functions**: https://console.firebase.google.com/project/YOUR_PROJECT/functions
- **Firestore**: https://console.firebase.google.com/project/YOUR_PROJECT/firestore
- **Auth**: https://console.firebase.google.com/project/YOUR_PROJECT/authentication

---

> [!IMPORTANT]
> Nunca commite secrets em arquivos `.env` ou código fonte. Sempre use o Secret Manager para variáveis sensíveis.

> [!TIP]
> Use `firebase functions:secrets:access SECRET_NAME` para verificar o valor de um secret localmente durante desenvolvimento.
