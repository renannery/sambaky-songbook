#!/usr/bin/env bash
#
# Deploy do SambaKY Songbook.
# Carimba a data/hora atual na versão (capa + Modo Palco), sincroniza o
# nome do cache do service worker, commita e dá push para o main.
#
# Uso:
#   ./deploy.sh                       # mensagem de commit automática
#   ./deploy.sh "ajuste no refrão"    # mensagem de commit personalizada
#
set -euo pipefail
cd "$(dirname "$0")"

# Carimbo no horário local da máquina (momento do deploy)
STAMP="$(date '+%Y-%m-%d · %H:%M %Z')"   # exibido na tela. ex: 2026-06-03 · 17:29 EST
SLUG="$(date '+%Y.%m.%d-%H%M')"          # usado no nome do cache. ex: 2026.06.03-1729

# Atualiza a versão exibida (index.html) e o cache do SW (sw.js).
# sed -i '' é a sintaxe do macOS (BSD).
sed -i '' "s|const APP_VERSION='[^']*'|const APP_VERSION='${STAMP}'|" index.html
sed -i '' "s|const CACHE = '[^']*'|const CACHE = 'sambaky-songbook-${SLUG}'|" sw.js

git add -A
if git diff --cached --quiet; then
  echo "Nada para commitar."
  exit 0
fi

MSG="${1:-Deploy ${STAMP}}"
git commit -q -m "${MSG}"
git push origin main

echo "✓ Publicado: ${STAMP}"
echo "  cache: sambaky-songbook-${SLUG}"
echo "  URL:   https://renannery.github.io/sambaky-songbook/"
