#!/bin/bash
# ============================================================
# Momentum Platform — Padronização Visual e Logo Unificada
# ------------------------------------------------------------
# Este script aplica automaticamente o layout Momentum Premium
# em todas as páginas (Hosting + Web React).
# Gera backups automáticos (.bak) antes de qualquer modificação.
# ============================================================

echo "🚀 Iniciando padronização Momentum Premium..."

# Verifica se está no diretório correto
if [ ! -d "hosting" ] || [ ! -d "web" ]; then
  echo "❌ Erro: este script deve ser executado na raiz do projeto Momentum_firebase-v7.4"
  exit 1
fi

# -------------------------------
# 1️⃣ LOGO UNIFICADA
# -------------------------------
echo "📦 Criando logo unificada..."
mkdir -p hosting/public/assets/brand
if [ -f "hosting/public/assets/brand/momentum-logo-light.png" ]; then
  cp hosting/public/assets/brand/momentum-logo-light.png hosting/public/assets/brand/momentum-logo.png
  echo "✅ Logo unificada criada em hosting/public/assets/brand/momentum-logo.png"
else
  echo "⚠️ Aviso: arquivo momentum-logo-light.png não encontrado. Verifique manualmente."
fi

# -------------------------------
# 2️⃣ SUBSTITUI LOGO NAS PÁGINAS HTML (HOSTING)
# -------------------------------
echo "🧩 Atualizando páginas estáticas..."
cd hosting/public || exit
for f in 500.html admin.html ai-mapping.html cfo-dashboard.html dashboard-analytics.html dashboard.html signup.html support.html; do
  if [ -f "$f" ]; then
    cp "$f" "$f.bak"
    sed -i 's|<div class="logo"></div>|<img class="brand-logo" src="/assets/brand/momentum-logo.png" alt="Logo MOMENTUM" />|g' "$f"
    echo "🔁 Atualizado: $f"
  fi
done

# Atualiza index.html
if [ -f "index.html" ]; then
  cp index.html index.html.bak
  sed -i 's|momentum-logo-light.png" data-dark="/assets/brand/momentum-logo-dark.png"|momentum-logo.png"|g' index.html
  echo "✅ Logo da landing page atualizada (index.html)"
fi

cd ../../

# -------------------------------
# 3️⃣ CSS GLOBAL (HOSTING)
# -------------------------------
CSS_PATH="hosting/public/assets/css/style.css"
if [ -f "$CSS_PATH" ]; then
  cp "$CSS_PATH" "$CSS_PATH.bak"
  echo "🎨 Atualizando $CSS_PATH..."
  cat <<'EOF' >> "$CSS_PATH"

  /* ====== MOMENTUM GLOBAL STYLES (AUTO-INJECTED) ====== */
  .brand-logo {
    width: 42px;
    height: 42px;
    object-fit: contain;
    display: inline-block;
  }

  .icon-gradient {
    background: linear-gradient(120deg, var(--brand-1), var(--brand-2));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
EOF
fi

# -------------------------------
# 4️⃣ WEB (REACT / VITE)
# -------------------------------
echo "⚛️ Atualizando estilos do app React..."

# Corrige paleta Momentum nas variáveis light
INDEX_CSS="web/src/index.css"
if [ -f "$INDEX_CSS" ]; then
  cp "$INDEX_CSS" "$INDEX_CSS.bak"
  sed -i 's|--brand-1:[^;]*;|--brand-1:#6e34ff;|' "$INDEX_CSS"
  sed -i 's|--brand-2:[^;]*;|--brand-2:#00c6ff;|' "$INDEX_CSS"
  echo "✅ Paleta Momentum restaurada no modo light"
  cat <<'EOF' >> "$INDEX_CSS"

/* ====== MOMENTUM GLOBAL STYLES (AUTO-INJECTED) ====== */
.brand-logo {
  width: 36px;
  height: 36px;
  object-fit: contain;
  display: inline-block;
}

.icon-gradient {
  background: linear-gradient(120deg, var(--brand-1), var(--brand-2));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
EOF
fi

# Substitui o bloco de logo da Sidebar.tsx
SIDEBAR="web/src/components/Sidebar.tsx"
if [ -f "$SIDEBAR" ]; then
  cp "$SIDEBAR" "$SIDEBAR.bak"
  sed -i '/conic-gradient/,+5c\      <img src="\/assets\/brand\/momentum-logo.png" alt="Logo MOMENTUM" className="brand-logo rounded-md shadow-soft" \/>' "$SIDEBAR"
  echo "✅ Sidebar.tsx atualizado com a logo real"
fi

# -------------------------------
# ✅ FINALIZAÇÃO
# -------------------------------
echo ""
echo "✨ Padronização concluída com sucesso!"
echo "Todos os arquivos originais foram salvos com extensão .bak."
echo "Reinicie o servidor local ou execute 'npm run dev' para ver as mudanças."
