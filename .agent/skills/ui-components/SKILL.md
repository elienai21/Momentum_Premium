---
name: ui-components
description: Criar interfaces consistentes usando Tailwind CSS e os componentes de UI pré-existentes
---

# UI Components & Tailwind CSS Skill

Esta skill define os padrões para criar interfaces consistentes no Momentum Platform usando Tailwind CSS e os componentes de UI pré-existentes.

---

## 1. Design System do Projeto

### 1.1 Paleta de Cores (CSS Variables)

```css
/* Light Mode */
--primary: #6e34ff;       /* Roxo vibrante */
--secondary: #00c6ff;     /* Cyan vibrante */
--background: #f8fafc;    /* Fundo claro */
--surface: #ffffff;       /* Cards/painéis */
--text-primary: #0f172a;  /* Texto principal */
--text-secondary: #040c16;/* Texto secundário */
--success: #0bbd78b9;     /* Verde sucesso */
--warning: #f59e0b;       /* Amarelo alerta */
--error: #f43f5e;         /* Vermelho erro */

/* Dark Mode */
--background: #020516;    /* Fundo escuro */
--surface: #0f172a;       /* Cards escuros */
--text-primary: #e2e8f0;  /* Texto claro */
```

### 1.2 Classes Tailwind Customizadas

Use as classes do namespace `momentum-*` para consistência:

| Classe | Uso |
|--------|-----|
| `bg-momentum-bg` | Fundo principal |
| `bg-momentum-surface` | Cards e painéis |
| `text-momentum-text` | Texto principal |
| `text-momentum-muted` | Texto secundário |
| `text-momentum-accent` | Cor de destaque (primary) |
| `text-momentum-success` | Estado de sucesso |
| `text-momentum-warn` | Estado de alerta |
| `text-momentum-danger` | Estado de erro |

### 1.3 Utilitários Globais

```css
/* Efeito Glass (backdrop blur) */
.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
}

/* Gradiente de texto */
.text-gradient {
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Sombras especiais */
.shadow-glow      /* Glow roxo */
.shadow-glow-cyan /* Glow cyan */
.shadow-soft      /* Sombra suave */
.shadow-3d        /* Sombra profunda */
```

---

## 2. Componentes UI Disponíveis

### 2.1 Mapa de Componentes

| Componente | Arquivo | Uso |
|------------|---------|-----|
| `GlassPanel` | `ui/GlassPanel.tsx` | Container base com efeito glass |
| `Card` | `Card.tsx` | Card com título e footer |
| `StatsCard` | `ui/StatsCard.tsx` | KPI com ícone e trend |
| `Badge` | `ui/Badge.tsx` | Labels de status |
| `EmptyState` | `EmptyState.tsx` | Estado vazio com CTA |
| `ErrorState` | `ui/ErrorState.tsx` | Estado de erro |
| `LoadingState` | `ui/LoadingState.tsx` | Skeleton loading |
| `Skeleton` | `ui/Skeleton.tsx` | Placeholder animado |
| `InsightCard` | `ui/InsightCard.tsx` | Card de insight AI |
| `SectionHeader` | `ui/SectionHeader.tsx` | Título de seção |
| `AsyncPanel` | `ui/AsyncPanel.tsx` | Wrapper loading/error/empty |

---

## 3. Padrões de Uso

### 3.1 Função `cn()` para Classes

> [!IMPORTANT]
> **SEMPRE** use `cn()` para combinar classes Tailwind. Isso garante merge correto de conflitos.

```typescript
import { cn } from "../../lib/utils";

// ✅ CORRETO
<div className={cn(
  "p-4 rounded-xl",
  isActive && "bg-primary",
  className  // Props externas
)} />

// ❌ ERRADO - conflitos não resolvidos
<div className={`p-4 rounded-xl ${isActive ? 'bg-primary' : ''} ${className}`} />
```

### 3.2 GlassPanel - Container Base

Use como wrapper para qualquer card/painel:

```tsx
import { GlassPanel } from "../components/ui/GlassPanel";

<GlassPanel className="p-6">
  <h2>Título</h2>
  <p>Conteúdo</p>
</GlassPanel>
```

### 3.3 Card - Container Estruturado

Para cards com título e footer:

```tsx
import { Card } from "../components/Card";

<Card
  title="Receitas do Mês"
  footer="Atualizado há 5 minutos"
  className="col-span-2"
>
  <span className="text-3xl font-bold">R$ 45.000</span>
</Card>
```

### 3.4 StatsCard - KPIs

Para métricas com ícone e tendência:

```tsx
import { StatsCard } from "../components/ui/StatsCard";
import { Wallet } from "lucide-react";

<StatsCard
  label="Saldo Atual"
  value="R$ 12.500"
  icon={Wallet}
  variant="success"
  trend={{ value: "12%", direction: "up" }}
/>
```

Variantes: `default` | `success` | `warn` | `danger`

### 3.5 Badge - Status Labels

```tsx
import { Badge } from "../components/ui/Badge";

<Badge variant="success">Pago</Badge>
<Badge variant="warn">Pendente</Badge>
<Badge variant="danger">Atrasado</Badge>
<Badge variant="neutral">Rascunho</Badge>
```

### 3.6 EmptyState - Estado Vazio

```tsx
import { EmptyState } from "../components/EmptyState";

<EmptyState
  title="Nenhuma transação encontrada"
  description="Importe seus dados financeiros para começar."
  icon="📊"
  actionLabel="Importar Dados"
  onActionClick={() => navigate("/import")}
/>
```

---

## 4. Padrões de Layout

### 4.1 Grid Responsivo

```tsx
// Dashboard típico
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  <StatsCard ... />
  <StatsCard ... />
  <StatsCard ... />
  <StatsCard ... />
</div>

// Card que ocupa mais espaço
<Card className="col-span-full lg:col-span-2">
  {/* Conteúdo largo */}
</Card>
```

### 4.2 Espaçamento Padrão

| Contexto | Classe |
|----------|--------|
| Entre cards | `gap-4` ou `gap-6` |
| Padding de card | `p-5` ou `p-6` |
| Margem de seção | `mb-6` ou `mb-8` |
| Espaçamento interno | `space-y-4` |

### 4.3 Tipografia

```tsx
// Títulos de página
<h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
  Dashboard
</h1>

// Subtítulos
<h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
  Receitas
</h2>

// Labels/captions
<span className="text-sm font-medium text-slate-500 dark:text-slate-400">
  Último mês
</span>

// Valores grandes
<span className="text-3xl font-bold text-primary">
  R$ 45.000
</span>
```

---

## 5. Dark Mode

### 5.1 Regras de Dark Mode

O projeto usa `darkMode: 'class'`. Sempre defina variantes dark:

```tsx
// ✅ CORRETO - Suporte a ambos temas
<div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">

// ❌ ERRADO - Só funciona no light mode
<div className="bg-white text-slate-900">
```

### 5.2 Shorthand com Variables

Prefira CSS variables que já adaptam automaticamente:

```tsx
// ✅ MELHOR - Usa variable que adapta ao tema
<div className="bg-momentum-surface text-momentum-text">

// Ou use a classe glass
<div className="glass p-4 rounded-xl">
```

---

## 6. Ícones

### 6.1 Material Icons (Principal)

O projeto usa Material Icons via fonte:

```tsx
// Ícone regular
<span className="material-icons-round text-slate-500">
  dashboard
</span>

// Tamanhos
<span className="material-icons-round text-sm">...</span>   // 14px
<span className="material-icons-round text-base">...</span> // 16px
<span className="material-icons-round text-xl">...</span>   // 20px
<span className="material-icons-round text-2xl">...</span>  // 24px
```

### 6.2 Lucide React (Alternativa)

Para ícones como props de componentes:

```tsx
import { Wallet, TrendingUp, AlertCircle } from "lucide-react";

<StatsCard icon={Wallet} ... />
```

---

## 7. Estado de Loading

### 7.1 Skeleton

```tsx
import { Skeleton } from "../components/ui/Skeleton";

<Skeleton className="h-8 w-32" />          // Texto
<Skeleton className="h-24 w-full" />       // Card
<Skeleton className="h-10 w-10 rounded-full" /> // Avatar
```

### 7.2 AsyncPanel Pattern

```tsx
import { AsyncPanel } from "../components/ui/AsyncPanel";

<AsyncPanel
  isLoading={isLoading}
  error={error}
  isEmpty={data.length === 0}
  emptyTitle="Sem dados"
  emptyDescription="Nenhum registro encontrado."
>
  {/* Conteúdo quando carregado */}
</AsyncPanel>
```

---

## 8. Checklist de Review

Ao revisar PRs com componentes UI:

- [ ] Usa `cn()` para combinar classes
- [ ] Tem suporte a dark mode (classes `dark:`)
- [ ] Usa componentes existentes quando aplicável
- [ ] Espaçamento consistente (`gap-4`, `p-5`, etc.)
- [ ] Tipografia segue hierarquia (h1 > h2 > p)
- [ ] Estados de loading/error/empty tratados
- [ ] Cores usam palette do sistema (`momentum-*` ou variables)
- [ ] Acessibilidade básica (aria-labels, roles)

---

## 9. Exemplo Completo: Nova Página

```tsx
// web/src/pages/MyNewPage.tsx
import { GlassPanel } from "../components/ui/GlassPanel";
import { StatsCard } from "../components/ui/StatsCard";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { Badge } from "../components/ui/Badge";
import { Wallet, TrendingUp } from "lucide-react";
import { cn } from "../lib/utils";

export default function MyNewPage() {
  const { data, isLoading, error } = useMyData();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        title="Nenhum dado encontrado"
        description="Adicione seus primeiros registros."
        icon="📊"
        actionLabel="Adicionar"
        onActionClick={() => {}}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Minha Página
        </h1>
        <Badge variant="success">Ativo</Badge>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          label="Total"
          value="R$ 10.000"
          icon={Wallet}
          variant="default"
          trend={{ value: "5%", direction: "up" }}
        />
        <StatsCard
          label="Crescimento"
          value="+15%"
          icon={TrendingUp}
          variant="success"
        />
      </div>

      {/* Content Card */}
      <Card title="Detalhes" className="col-span-full">
        <p className="text-slate-600 dark:text-slate-400">
          Conteúdo aqui...
        </p>
      </Card>
    </div>
  );
}
```

---

> [!TIP]
> Use a extensão Tailwind CSS IntelliSense no VS Code para autocompletar classes.

> [!WARNING]
> Evite criar novos componentes para layouts simples. Prefira composição com GlassPanel + classes Tailwind.
