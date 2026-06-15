#!/usr/bin/env bash
# Start both backend (ws) and frontend (web) servers as background processes.
# Writes PIDs to .runtime/ and logs to .runtime/logs/.
# Usage: ./scripts/start.sh [dev|build]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RUNTIME="$ROOT/.runtime"
mkdir -p "$RUNTIME/logs" "$RUNTIME/pids"

stop_existing() {
  for f in "$RUNTIME"/pids/*.pid; do
    [ -e "$f" ] || continue
    local pid
    pid=$(cat "$f")
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
    rm -f "$f"
  done
}

start_ws() {
  echo "[start] ws: cd apps/ws && tsx src/index.ts"
  ( cd "$ROOT/apps/ws" && setsid nohup node_modules/.bin/tsx src/index.ts > "$RUNTIME/logs/ws.log" 2>&1 & echo $! > "$RUNTIME/pids/ws.pid" ) < /dev/null > /dev/null 2>&1 &
  disown || true
  sleep 1
}

start_web_dev() {
  echo "[start] web (dev): cd apps/web && vite --port 14022"
  ( cd "$ROOT/apps/web" && setsid nohup node_modules/.bin/vite --host 0.0.0.0 --port 14022 > "$RUNTIME/logs/web.log" 2>&1 & echo $! > "$RUNTIME/pids/web.pid" ) < /dev/null > /dev/null 2>&1 &
  disown || true
  sleep 2
}

start_web_build() {
  echo "[start] web (build): vite build + preview"
  ( cd "$ROOT/apps/web" && setsid nohup node_modules/.bin/vite preview --host 0.0.0.0 --port 14022 --strictPort > "$RUNTIME/logs/web.log" 2>&1 & echo $! > "$RUNTIME/pids/web.pid" ) < /dev/null > /dev/null 2>&1 &
  disown || true
  sleep 2
}

stop_existing
start_ws
if [ "${1:-dev}" = "build" ]; then
  start_web_build
else
  start_web_dev
fi

sleep 3
echo "[start] done. PIDs:"
for f in "$RUNTIME"/pids/*.pid; do
  [ -e "$f" ] || continue
  echo "  $(basename "$f" .pid) -> $(cat "$f")"
done
echo "[start] ports:"
ss -tln 2>/dev/null | grep -E ':(14022|14045)' || echo "  (no listeners yet)"
echo "[start] health:"
curl -sf http://127.0.0.1:14045/ || echo "  ws health: not ready"
curl -sf -o /dev/null -w "  web HTTP %{http_code}\n" http://127.0.0.1:14022/ || echo "  web: not ready"
