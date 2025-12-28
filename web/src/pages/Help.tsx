// web/src/pages/Help.tsx
// Página "Ajuda / Como funciona" — foco em clareza, UX e acessibilidade.
// Não exige dependências novas. Usa Tailwind como o restante do app.
// Dica: como sua Topbar é fixa (h-14), adicionamos pt-16 para evitar sobreposição.

import React from "react";

export default function Help() {
  return (
    <main
      className="pt-16 mx-auto max-w-5xl p-6 space-y-6"
      aria-labelledby="help-title"
      aria-describedby="help-subtitle"
    >
      {/* Cabeçalho */}
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/80">
        <h1
          id="help-title"
          className="text-xl font-semibold text-slate-900 dark:text-slate-100"
        >
          Ajuda & Como funciona
        </h1>
        <p
          id="help-subtitle"
          className="mt-1 text-sm text-slate-600 dark:text-slate-300"
        >
          Guia rápido para aproveitar o máximo do Momentum Premium — do Pulse ao
          CFO, Mercado, Voz e Suporte IA, incluindo o modelo de créditos.
        </p>
      </header>

      {/* Sumário rápido */}
      <nav className="grid gap-3 sm:grid-cols-2" aria-label="Navegação rápida">
        {[
          { href: "#pulse", label: "Pulse (Dashboard Financeiro)" },
          { href: "#cfo", label: "CFO Inteligente" },
          { href: "#market", label: "Conselheiro de Mercado" },
          { href: "#advisor", label: "Advisor (assistente financeiro)" },
          { href: "#voice", label: "Voice (voz e transcrição)" },
          { href: "#support", label: "SupportDock (suporte IA)" },
          { href: "#credits", label: "Créditos de IA (billing)" },
          { href: "#onboarding", label: "Onboarding & Configurações" },
        ].map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950/80 dark:text-slate-200"
          >
            {link.label}
          </a>
        ))}
      </nav>

      {/* Pulse */}
      <section
        id="pulse"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/80"
        aria-labelledby="pulse-h"
      >
        <h2
          id="pulse-h"
          className="text-lg font-semibold text-slate-900 dark:text-slate-100"
        >
          Pulse (Dashboard Financeiro)
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          O Pulse mostra KPIs-chave (caixa, receitas, despesas, runway) e a
          evolução recente. Se não houver dados, você verá um estado guiado para
          importar transações.
        </p>
        <ul className="mt-3 list-disc pl-5 text-sm text-slate-700 dark:text-slate-200">
          <li>KPIs e gráficos reagem à sua base de dados atual.</li>
          <li>Use “Nova importação” para atualizar rapidamente sua fotografia financeira.</li>
          <li>Botões “Abrir Advisor” e “Abrir Suporte” aceleram dúvidas e ações.</li>
        </ul>
      </section>

      {/* CFO */}
      <section
        id="cfo"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/80"
        aria-labelledby="cfo-h"
      >
        <h2
          id="cfo-h"
          className="text-lg font-semibold text-slate-900 dark:text-slate-100"
        >
          CFO Inteligente
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Avalia a saúde financeira, sugere um plano de ação e mostra o impacto
          esperado (caixa, lucro, margem) no cenário base.
        </p>
        <ul className="mt-3 list-disc pl-5 text-sm text-slate-700 dark:text-slate-200">
          <li>
            <strong>Health Score:</strong> leitura rápida da saúde do negócio.
          </li>
          <li>
            <strong>Plano de Ação:</strong> tarefas priorizadas para estabilizar
            ou acelerar.
          </li>
          <li>
            <strong>Simulações:</strong> explore cenários e aplique ajustes com
            segurança.
          </li>
        </ul>
      </section>

      {/* Market Advisor */}
      <section
        id="market"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/80"
        aria-labelledby="market-h"
      >
        <h2
          id="market-h"
          className="text-lg font-semibold text-slate-900 dark:text-slate-100"
        >
          Conselheiro de Mercado
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Analisa setor, região e porte para produzir uma visão objetiva de
          mercado: fatos, padrões históricos, riscos, oportunidades, comportamento
          do consumidor e ações recomendadas. Sempre com foco em dados, sem
          opinião pessoal.
        </p>
        <ul className="mt-3 list-disc pl-5 text-sm text-slate-700 dark:text-slate-200">
          <li>
            Opcionalmente, faça uma pergunta para contextualizar a análise (ex.:
            expansão).
          </li>
          <li>Respeita plano e créditos do tenant antes de gerar a visão.</li>
          <li>Integra-se ao CFO para decisões mais informadas.</li>
        </ul>
      </section>

      {/* Advisor */}
      <section
        id="advisor"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/80"
        aria-labelledby="advisor-h"
      >
        <h2
          id="advisor-h"
          className="text-lg font-semibold text-slate-900 dark:text-slate-100"
        >
          Advisor (assistente financeiro)
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Assistente conversacional especializado em finanças/gestão. Ideal para
          “por que a margem caiu?” ou “qual estratégia de preço faz sentido?”.
        </p>
      </section>

      {/* Voice */}
      <section
        id="voice"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/80"
        aria-labelledby="voice-h"
      >
        <h2
          id="voice-h"
          className="text-lg font-semibold text-slate-900 dark:text-slate-100"
        >
          Voice (voz e transcrição)
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Text-to-Speech e Speech-to-Text por tenant, com perfis de voz por
          plano. Útil no Advisor e no Suporte para leitura/ditado.
        </p>
      </section>

      {/* SupportDock */}
      <section
        id="support"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/80"
        aria-labelledby="support-h"
      >
        <h2
          id="support-h"
          className="text-lg font-semibold text-slate-900 dark:text-slate-100"
        >
          SupportDock (suporte IA)
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Suporte contextual (RAG) com créditos dedicados e respostas orientadas
          ao uso do produto. Disponível para todos os planos com limites
          configuráveis.
        </p>
      </section>

      {/* Créditos */}
      <section
        id="credits"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/80"
        aria-labelledby="credits-h"
      >
        <h2
          id="credits-h"
          className="text-lg font-semibold text-slate-900 dark:text-slate-100"
        >
          Créditos de IA (billing)
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Cada recurso de IA consome créditos conforme tabela do plano. Ao
          atingir o limite, o sistema bloqueia a rota e sugere upgrade ou
          renovação.
        </p>
        <ul className="mt-3 list-disc pl-5 text-sm text-slate-700 dark:text-slate-200">
          <li>Mensagens de “sem créditos” são claras e orientam o usuário.</li>
          <li>Admin pode ajustar planos/limites via Console.</li>
        </ul>
      </section>

      {/* Onboarding */}
      <section
        id="onboarding"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/80"
        aria-labelledby="onboarding-h"
      >
        <h2
          id="onboarding-h"
          className="text-lg font-semibold text-slate-900 dark:text-slate-100"
        >
          Onboarding & Configurações
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          No primeiro acesso, preencha setor, região e porte para ativar
          recomendações sob medida. Você pode alterar esses dados depois no
          Admin.
        </p>
      </section>
    </main>
  );
}
