#!/usr/bin/env bash
# =============================================================================
# start.sh — Launch both the WebSocket server (port 14045) and the Vite dev
# server (port 14022) as background processes.
#
# In `dev` mode (default), the Vite dev server is started for hot-reload
# development.  In `build` mode, the production bundle is built and served
# via `vite preview`.
#
# Every background process writes its PID to .runtime/pids/<name>.pid and
# its stdout/stderr to .runtime/logs/<name>.log.  The script also performs
# a quick health-check with curl at the end to confirm both servers are
# listening.
#
# Usage: ./scripts/start.sh [dev|build]
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RUNTIME="$ROOT/.runtime"
mkdir -p "$RUNTIME/logs" "$RUNTIME/pids"

# Kill any leftover server processes from a prior run so ports are free.
# Iterates every .pid file in .runtime/pids/, checks if the process is
# still alive with `kill -0`, sends SIGTERM if so, then removes the file.
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
  # `setsid nohup` detaches the process from the terminal so it survives
  # when the terminal is closed.  Output is captured in .runtime/logs/ws.log
  # and the PID is written to .runtime/pids/ws.pid.
  ( cd "$ROOT/apps/ws" && setsid nohup node_modules/.bin/tsx src/index.ts > "$RUNTIME/logs/ws.log" 2>&1 & echo $! > "$RUNTIME/pids/ws.pid" ) < /dev/null > /dev/null 2>&1 &
  # `disown` removes the background job from the shell's job table so the
  # shell does not try to report its exit status or block on `wait`.
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
# `dev` mode starts the Vite dev server (hot reload); `build` mode runs
# `vite preview` to serve the pre-built production bundle.
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
# Quick health-check: curl each server and report HTTP status.
# The WebSocket server exposes a minimal HTTP endpoint on the same port
# so a plain curl works to confirm it's listening.
echo "[start] health:"
curl -sf http://127.0.0.1:14045/ || echo "  ws health: not ready"
curl -sf -o /dev/null -w "  web HTTP %{http_code}\n" http://127.0.0.1:14022/ || echo "  web: not ready"
