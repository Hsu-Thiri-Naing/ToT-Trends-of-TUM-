#!/usr/bin/env bash
set -euo pipefail
root=$(cd "$(dirname "$0")/.." && pwd)
api="$root/api.totumdy.com"
chat="$root/chat-server-nodejs-v2"
ui="$root/tot-frontend"
cd "$api"
for tool in php composer node npm curl; do
    command -v "$tool" >/dev/null || { echo "Missing $tool. See AGENTS.md." >&2; exit 1; }
done
export APP_ENV=local APP_DEBUG=false APP_URL=http://127.0.0.1:8000
export DB_CONNECTION=sqlite DB_DATABASE="$api/database/portfolio.sqlite" DATABASE_URL='(null)'
export APP_CONFIG_CACHE="$api/bootstrap/cache/portfolio-config.php"
export FILESYSTEM_DISK=public SESSION_DRIVER=file CACHE_DRIVER=file
export CHAT_HOST=127.0.0.1 PORT=3001 NODE_SERVER_URL=http://127.0.0.1:3001
export FRONTEND_URL=http://127.0.0.1:5173 CORS_ORIGINS=http://127.0.0.1:5173
export LARAVEL_API_BASE_URL="$APP_URL/api" VITE_API_BASE_URL="$APP_URL/api"
export VITE_SERVER_BASE_URL="$APP_URL" VITE_SOCKET_URL="$NODE_SERVER_URL"
if [[ ! -e storage/portfolio.key ]]; then
    (umask 077; php -r 'echo "base64:".base64_encode(random_bytes(32));' > storage/portfolio.key)
fi
APP_KEY=$(tr -d '\r\n' < storage/portfolio.key)
NODE_SERVER_KEY=$(php -r 'echo bin2hex(random_bytes(32));')
export APP_KEY NODE_SERVER_KEY
[[ -e "$DB_DATABASE" ]] || cp database/portfolio-demo.sqlite "$DB_DATABASE"
composer install --no-interaction --prefer-dist
php artisan migrate --force
[[ -e public/storage ]] || php artisan storage:link
for dir in "$chat" "$ui"; do (cd "$dir" && npm ci --no-audit --no-fund); done
pids=()
cleanup() { for pid in "${pids[@]}"; do kill "$pid" 2>/dev/null || true; done; }
trap cleanup EXIT
trap 'exit 0' INT TERM
(cd public && exec php -d upload_max_filesize=20M -d post_max_size=24M -S 127.0.0.1:8000 "$api/vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php") &
pids+=($!)
(cd "$chat" && exec node server.js) &
pids+=($!)
(cd "$ui" && exec node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173 --strictPort) &
pids+=($!)
for url in "$APP_URL" "$NODE_SERVER_URL/socket.io/?EIO=4&transport=polling" "$FRONTEND_URL"; do
    ready=false
    for ((i=0; i<30; i++)); do
        if curl -fsS --max-time 2 "$url" >/dev/null 2>&1; then ready=true; break; fi
        sleep 0.5
    done
    "$ready" || { echo "Startup failed at $url" >&2; exit 1; }
done
echo "Open $FRONTEND_URL | maya@tot.com / TotPortfolio1! | Stop with Ctrl+C or kill $$"
while true; do
    for pid in "${pids[@]}"; do kill -0 "$pid" 2>/dev/null || exit 1; done
    sleep 2
done
