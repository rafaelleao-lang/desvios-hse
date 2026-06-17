#!/usr/bin/env bash
# =============================================================================
# Deploy/atualização da aplicação desvios-hse
# Uso:  ./deploy.sh            (atualiza a branch atual)
#       ./deploy.sh <branch>   (faz checkout da branch informada)
# Só reinicia a aplicação se o build for bem-sucedido.
# =============================================================================
set -euo pipefail

# Garante node/npm/pm2 no PATH mesmo em shells não-interativos (ex.: GitHub Actions)
export PATH="/usr/local/bin:$PATH"

APP_DIR="/var/www/desvios-hse"
APP_NAME="desvios-hse"
BRANCH="${1:-}"

cd "$APP_DIR"

log() { echo -e "\n==> $*"; }

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
TARGET_BRANCH="${BRANCH:-$CURRENT_BRANCH}"

log "Atualizando código (branch: ${TARGET_BRANCH})"
git fetch origin "$TARGET_BRANCH"
git checkout "$TARGET_BRANCH"
git reset --hard "origin/${TARGET_BRANCH}"

# Grava variáveis de e-mail se fornecidas pelo pipeline de deploy
if [ -n "${SMTP_HOST:-}" ]; then
  log "Atualizando configuração SMTP (.env.production.local)"
  cat > "$APP_DIR/.env.production.local" <<EOF
SMTP_HOST=${SMTP_HOST}
SMTP_PORT=${SMTP_PORT}
SMTP_USER=${SMTP_USER}
SMTP_PASS=${SMTP_PASS}
EOF
fi

log "Instalando dependências (npm ci)"
npm ci

log "Gerando build de produção"
npm run build

log "Reiniciando aplicação (PM2)"
pm2 restart "$APP_NAME" --update-env
pm2 save

log "Deploy concluído."
pm2 status
echo "--- healthcheck ---"
curl -s -o /dev/null -w "local HTTP %{http_code}\n" http://127.0.0.1:3000/ || true
