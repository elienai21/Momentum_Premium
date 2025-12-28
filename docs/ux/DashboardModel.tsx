<!DOCTYPE html>
<html class="dark" lang="pt-BR"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Momentum Premium Dashboard</title>
<link href="https://fonts.googleapis.com" rel="preconnect"/>
<link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect"/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&amp;family=Plus+Jakarta+Sans:wght@300;400;500;600;700&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script src="https://cdn.tailwindcss.com?plugins=forms,typography"></script>
<script>
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['"Inter"', '"Plus Jakarta Sans"', 'sans-serif'],
                        display: ['"Plus Jakarta Sans"', 'sans-serif'],
                    },
                    colors: {
                        primary: "#6e34ff", // Electric Purple
                        secondary: "#00c6ff", // Cyan Blue
                        "background-light": "#f8fafc", // Slate 50
                        "background-dark": "#020617", // Slate 950
                        success: "#10b981", // Emerald 500
                        warning: "#f59e0b", // Amber 500
                        error: "#f43f5e", // Rose 500
                        surface: {
                            light: "#ffffff",
                            dark: "#0f172a", // Slate 900
                        }
                    },
                    borderRadius: {
                        DEFAULT: "0.75rem",
                    },
                    boxShadow: {
                        'glow': '0 0 20px rgba(110, 52, 255, 0.15)',
                        'glow-cyan': '0 0 20px rgba(0, 198, 255, 0.15)',
                    }
                },
            },
        };
    </script>
<style>
        ::-webkit-scrollbar {
            width: 6px;
        }
        ::-webkit-scrollbar-track {
            background: transparent;
        }
        ::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 4px;
        }
        .dark ::-webkit-scrollbar-thumb {
            background: #334155;
        }
        .glass {
            background: rgba(255, 255, 255, 0.7);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.5);
        }
        .dark .glass {
            background: rgba(15, 23, 42, 0.6);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .text-gradient {
            background: linear-gradient(135deg, #6e34ff 0%, #00c6ff 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        @keyframes dash {
            from { stroke-dashoffset: 283; }
            to { stroke-dashoffset: 40; }
        }
        .gauge-anim {
            animation: dash 1.5s ease-out forwards;
        }
        @keyframes drawLine {
            from { stroke-dashoffset: 1000; }
            to { stroke-dashoffset: 0; }
        }
        @keyframes fadeInArea {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        .chart-line {
            stroke-dasharray: 1000;
            stroke-dashoffset: 1000;
            animation: drawLine 2s ease-out forwards;
        }
        .chart-area {
            opacity: 0;
            animation: fadeInArea 1s ease-out 0.5s forwards;
        }
    </style>
</head>
<body class="bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-200 font-sans antialiased transition-colors duration-300 min-h-screen flex overflow-hidden">
<aside class="w-64 fixed h-full z-30 hidden md:flex flex-col glass border-r border-slate-200 dark:border-slate-800">
<div class="h-20 flex items-center px-6">
<div class="flex items-center gap-3">
<div class="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">
<span class="material-icons-round text-sm">show_chart</span>
</div>
<div>
<h1 class="text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-none font-display">MOMENTUM</h1>
<span class="text-[10px] font-semibold tracking-widest text-primary uppercase font-display">Premium v14.6</span>
</div>
</div>
</div>
<nav class="flex-1 px-4 space-y-1 py-4 overflow-y-auto">
<p class="px-2 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 font-display">Principal</p>
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary text-white shadow-glow group" href="#">
<span class="material-icons-round text-[20px]">dashboard</span>
<span class="text-sm font-medium">Dashboard</span>
</a>
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors group" href="#">
<span class="material-icons-round text-[20px] group-hover:text-primary transition-colors">receipt_long</span>
<span class="text-sm font-medium">Transações</span>
</a>
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors group" href="#">
<span class="material-icons-round text-[20px] group-hover:text-primary transition-colors">verified_user</span>
<span class="text-sm font-medium">Auditoria &amp; Limpeza</span>
</a>
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors group" href="#">
<span class="material-icons-round text-[20px] group-hover:text-primary transition-colors">psychology</span>
<span class="text-sm font-medium">IA &amp; Insights</span>
<span class="ml-auto bg-gradient-to-r from-primary to-secondary text-[10px] px-1.5 py-0.5 rounded text-white font-bold">NEW</span>
</a>
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors group" href="#">
<span class="material-symbols-outlined text-[20px] group-hover:text-primary transition-colors">finance_mode</span>
<span class="text-sm font-medium">Deep Dive Financeiro</span>
</a>
<p class="px-2 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-6 mb-2 font-display">Gerenciamento</p>
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors group" href="#">
<span class="material-icons-round text-[20px] group-hover:text-primary transition-colors">people</span>
<span class="text-sm font-medium">Clientes</span>
</a>
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors group" href="#">
<span class="material-icons-round text-[20px] group-hover:text-primary transition-colors">domain</span>
<span class="text-sm font-medium">Real Estate</span>
</a>
<a class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors group" href="#">
<span class="material-icons-round text-[20px] group-hover:text-primary transition-colors">settings</span>
<span class="text-sm font-medium">Configurações</span>
</a>
</nav>
<div class="p-4 border-t border-slate-200 dark:border-slate-800">
<div class="flex items-center gap-3 px-2 py-2">
<div class="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-display">GM</div>
<div class="flex flex-col">
<span class="text-xs font-medium dark:text-slate-300 font-display">Glass Momentum</span>
<span class="text-[10px] text-slate-500 font-display">v14.6 Enterprise</span>
</div>
</div>
</div>
</aside>
<main class="flex-1 md:ml-64 relative h-full overflow-y-auto">
<header class="sticky top-0 z-20 h-20 px-8 flex items-center justify-between glass border-b border-slate-200 dark:border-slate-800">
<div class="relative w-96 hidden md:block">
<span class="material-icons-round absolute left-3 top-2.5 text-slate-400">search</span>
<input class="w-full bg-slate-100 dark:bg-slate-800/50 border-none rounded-full pl-10 pr-4 py-2 text-sm text-slate-600 dark:text-slate-200 focus:ring-2 focus:ring-primary focus:bg-white dark:focus:bg-slate-800 transition-all placeholder-slate-400 dark:placeholder-slate-500" placeholder="Buscar transações, insights ou clientes..." type="text"/>
</div>
<div class="flex items-center gap-4">
<button class="relative p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 dark:text-slate-400">
<span class="material-icons-round">notifications</span>
<span class="absolute top-2 right-2 w-2 h-2 rounded-full bg-error ring-2 ring-white dark:ring-slate-900"></span>
</button>
<button class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300" onclick="document.documentElement.classList.toggle('dark')">
<span class="material-icons-round text-sm text-warning dark:hidden">light_mode</span>
<span class="material-icons-round text-sm text-primary hidden dark:inline">dark_mode</span>
<span class="dark:hidden">Light</span>
<span class="hidden dark:inline">Dark</span>
</button>
<div class="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>
<div class="flex items-center gap-3">
<div class="text-right hidden sm:block">
<p class="text-sm font-semibold text-slate-900 dark:text-white font-display">Elienai</p>
<p class="text-xs text-slate-500 dark:text-slate-400 font-display">Admin</p>
</div>
<div class="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-blue-600 flex items-center justify-center text-white font-bold shadow-glow">
                        E
                    </div>
</div>
</div>
</header>
<div class="p-8 space-y-8 pb-20">
<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
<div>
<h2 class="text-2xl font-bold text-slate-900 dark:text-white font-display">Olá, <span class="text-primary">Elienai</span></h2>
<p class="text-slate-500 dark:text-slate-400 font-display">Empresa: <span class="text-slate-700 dark:text-slate-200 font-medium">TechSolutions Ltd.</span></p>
</div>
<div class="flex flex-wrap gap-2">
<span class="px-3 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 shadow-sm">
<span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Últimos 7 dias
                    </span>
<span class="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 shadow-sm">
<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Última importação: há 2 dias
                    </span>
<span class="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1 shadow-sm">
<span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span> Atualizado: há poucos minutos
                    </span>
</div>
</div>
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
<div class="glass p-6 rounded-xl flex flex-col justify-between hover:border-primary/50 transition-colors group relative overflow-hidden">
<div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
<span class="material-icons-round text-6xl text-primary">account_balance_wallet</span>
</div>
<div class="flex items-center gap-2 mb-2">
<span class="material-icons-round text-slate-400 text-sm">account_balance</span>
<span class="text-sm font-medium text-slate-500 dark:text-slate-400">Saldo em Caixa</span>
</div>
<div>
<h3 class="text-2xl font-bold text-slate-900 dark:text-white mb-1">R$ 1.240.500</h3>
<div class="flex items-center gap-1 text-xs text-success bg-success/10 w-fit px-2 py-0.5 rounded-full">
<span class="material-icons-round text-[14px]">trending_up</span>
<span>+12.5%</span>
</div>
</div>
</div>
<div class="glass p-6 rounded-xl flex flex-col justify-between hover:border-secondary/50 transition-colors group relative overflow-hidden">
<div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
<span class="material-icons-round text-6xl text-secondary">payments</span>
</div>
<div class="flex items-center gap-2 mb-2">
<span class="material-icons-round text-slate-400 text-sm">monetization_on</span>
<span class="text-sm font-medium text-slate-500 dark:text-slate-400">Receita (MRR)</span>
</div>
<div>
<h3 class="text-2xl font-bold text-slate-900 dark:text-white mb-1">R$ 380.200</h3>
<div class="flex items-center gap-1 text-xs text-success bg-success/10 w-fit px-2 py-0.5 rounded-full">
<span class="material-icons-round text-[14px]">trending_up</span>
<span>+4.2%</span>
</div>
</div>
</div>
<div class="glass p-6 rounded-xl flex flex-col justify-between hover:border-error/50 transition-colors group relative overflow-hidden">
<div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
<span class="material-icons-round text-6xl text-error">credit_card_off</span>
</div>
<div class="flex items-center gap-2 mb-2">
<span class="material-icons-round text-slate-400 text-sm">outbound</span>
<span class="text-sm font-medium text-slate-500 dark:text-slate-400">Despesas</span>
</div>
<div>
<h3 class="text-2xl font-bold text-slate-900 dark:text-white mb-1">R$ 145.300</h3>
<div class="flex items-center gap-1 text-xs text-error bg-error/10 w-fit px-2 py-0.5 rounded-full">
<span class="material-icons-round text-[14px]">trending_up</span>
<span>+2.1% (Atenção)</span>
</div>
</div>
</div>
<div class="glass p-6 rounded-xl flex flex-col justify-between hover:border-warning/50 transition-colors group relative overflow-hidden">
<div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
<span class="material-icons-round text-6xl text-warning">hourglass_bottom</span>
</div>
<div class="flex items-center gap-2 mb-2">
<span class="material-icons-round text-slate-400 text-sm">timelapse</span>
<span class="text-sm font-medium text-slate-500 dark:text-slate-400">Runway</span>
</div>
<div>
<h3 class="text-2xl font-bold text-slate-900 dark:text-white mb-1">14 Meses</h3>
<div class="flex items-center gap-1 text-xs text-warning bg-warning/10 w-fit px-2 py-0.5 rounded-full">
<span class="material-icons-round text-[14px]">remove</span>
<span>Estável</span>
</div>
</div>
</div>
</div>
<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
<div class="lg:col-span-2 glass rounded-xl p-8 relative overflow-hidden border border-primary/20">
<div class="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
<div class="flex flex-col md:flex-row items-center gap-8 md:gap-12 h-full">
<div class="relative w-48 h-48 flex-shrink-0">
<svg class="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
<circle class="text-slate-200 dark:text-slate-800" cx="50" cy="50" fill="none" r="45" stroke="currentColor" stroke-width="8"></circle>
<circle class="gauge-anim drop-shadow-[0_0_10px_rgba(110,52,255,0.5)]" cx="50" cy="50" fill="none" r="45" stroke="url(#gradient)" stroke-dasharray="283" stroke-dashoffset="40" stroke-linecap="round" stroke-width="8"></circle>
<defs>
<linearGradient id="gradient" x1="0%" x2="100%" y1="0%" y2="0%">
<stop offset="0%" stop-color="#6e34ff"></stop>
<stop offset="100%" stop-color="#00c6ff"></stop>
</linearGradient>
</defs>
</svg>
<div class="absolute inset-0 flex flex-col items-center justify-center">
<span class="text-4xl font-bold text-slate-900 dark:text-white">85</span>
<span class="text-xs uppercase font-bold text-slate-500 tracking-wider">Score</span>
</div>
</div>
<div class="flex-1 space-y-4 relative z-10">
<div class="flex items-center gap-2 mb-2">
<span class="flex h-6 w-6 items-center justify-center rounded bg-primary/20 text-primary">
<span class="material-icons-round text-sm">auto_awesome</span>
</span>
<h3 class="text-lg font-bold text-slate-900 dark:text-white font-display">Análise de Saúde Financeira</h3>
</div>
<p class="text-slate-600 dark:text-slate-300 leading-relaxed text-sm">
                                Sua saúde financeira está <strong class="text-success">excelente</strong>. O fluxo de caixa permanece positivo pelo 4º mês consecutivo. Identificamos uma oportunidade de otimização tributária nas despesas de infraestrutura que pode aumentar seu runway em até 45 dias.
                            </p>
<div class="pt-2 flex gap-3">
<button class="bg-primary hover:bg-primary/90 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors shadow-glow flex items-center gap-2">
                                    Ver Detalhes
                                    <span class="material-icons-round text-sm">arrow_forward</span>
</button>
<button class="bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-5 py-2 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700 transition-colors">
                                    Exportar Relatório
                                </button>
</div>
</div>
</div>
</div>
<div class="glass rounded-xl p-6 border-l-4 border-l-secondary/80 flex flex-col h-full">
<div class="flex items-center justify-between mb-6">
<div class="flex items-center gap-2">
<div class="w-8 h-8 rounded bg-gradient-to-br from-slate-800 to-black border border-slate-700 flex items-center justify-center shadow-lg">
<span class="material-icons-round text-secondary text-sm">smart_toy</span>
</div>
<h3 class="font-bold text-slate-900 dark:text-white font-display">Sugestões do CFO</h3>
</div>
<span class="text-[10px] bg-secondary/10 text-secondary px-2 py-1 rounded border border-secondary/20 font-medium">IA Ativa</span>
</div>
<div class="space-y-4 flex-1">
<div class="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700/50 hover:border-primary/40 transition-colors cursor-pointer">
<div class="flex justify-between items-start mb-2">
<h4 class="text-sm font-semibold text-slate-800 dark:text-slate-200">Reduzir custo AWS</h4>
<span class="text-[10px] text-success font-bold bg-success/10 px-1.5 py-0.5 rounded">Economia: R$ 5k/mês</span>
</div>
<p class="text-xs text-slate-500 mb-3">Detectamos instâncias ociosas que podem ser desligadas.</p>
<div class="flex gap-2">
<button class="flex-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] py-1.5 rounded font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition">Simular</button>
<button class="flex-1 bg-primary/10 text-primary hover:bg-primary hover:text-white text-[10px] py-1.5 rounded font-medium transition border border-primary/20">Aplicar</button>
</div>
</div>
<div class="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700/50 hover:border-primary/40 transition-colors cursor-pointer">
<div class="flex justify-between items-start mb-2">
<h4 class="text-sm font-semibold text-slate-800 dark:text-slate-200">Renegociar SaaS</h4>
<span class="text-[10px] text-warning font-bold bg-warning/10 px-1.5 py-0.5 rounded">Alerta</span>
</div>
<p class="text-xs text-slate-500 mb-3">Contrato CRM vence em 15 dias. Inicie renegociação.</p>
<div class="flex gap-2">
<button class="flex-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] py-1.5 rounded font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition">Ver Contrato</button>
<button class="flex-1 bg-primary/10 text-primary hover:bg-primary hover:text-white text-[10px] py-1.5 rounded font-medium transition border border-primary/20">Agendar Email</button>
</div>
</div>
</div>
</div>
</div>
<section class="border-t border-slate-200 dark:border-slate-800 pt-8 mt-4 animate-fade-in-up">
<div class="glass relative overflow-hidden rounded-xl border border-primary/20 p-8 shadow-sm group">
<div class="absolute top-0 right-0 -mt-4 -mr-4 w-64 h-64 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full blur-3xl opacity-50 transition-opacity group-hover:opacity-70"></div>
<div class="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
<div class="flex items-start gap-5">
<div class="hidden sm:flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary text-white shadow-glow">
<span class="material-symbols-outlined text-3xl">finance_mode</span>
</div>
<div>
<h2 class="text-2xl font-bold text-slate-900 dark:text-white font-display mb-2 flex items-center gap-2">
                                    Deep Dive Financeiro
                                    <span class="sm:hidden material-symbols-outlined text-primary">finance_mode</span>
</h2>
<p class="text-slate-600 dark:text-slate-400 max-w-2xl text-sm leading-relaxed">
                                    Acesse a nova tela dedicada para análises profundas. Visualize o fluxo de caixa (Inflows vs. Outflows), monitore a tabela de transações inteligentes e receba alertas de anomalias detectadas por IA em tempo real.
                                </p>
</div>
</div>
<button class="w-full md:w-auto shrink-0 bg-primary hover:bg-primary/90 text-white px-6 py-3.5 rounded-lg text-sm font-medium transition-all shadow-glow hover:shadow-lg flex items-center justify-center gap-2 group/btn">
<span>Acessar Análise Completa</span>
<span class="material-icons-round text-sm group-hover/btn:translate-x-1 transition-transform">arrow_forward</span>
</button>
</div>
</div>
</section>
<div class="flex gap-4">
<button class="px-4 py-2 rounded-full border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                    Abir Suporte
                </button>
<button class="px-4 py-2 rounded-full border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                    Falar com Advisor
                </button>
</div>
</div>
</main>
<div class="fixed bottom-6 right-6 z-50">
<button class="w-14 h-14 rounded-full bg-success text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform">
<span class="material-icons-round text-2xl">chat_bubble_outline</span>
</button>
</div>

</body></html>