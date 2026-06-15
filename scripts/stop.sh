#!/usr/bin/env bash
# Stop background servers started by scripts/start.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RUNTIME="$ROOT/.runtime"
for f in "$RUNTIME"/pids/*.pid; do
  [ -e "$f" ] || continue
  pid=$(cat "$f")
  name=$(basename "$f" .pid)
  if kill -0 "$pid" 2>/dev/null; then
    echo "[stop] $name (pid $pid): sending SIGTERM"
    kill "$pid" 2>/dev/null || true
    sleep 1
    if kill -0 "$pid" 2>/dev/null; then
      echo "[stop] $name (pid $pid): still alive, sending SIGKILL"
      kill -9 "$pid" 2>/dev/null || true
    fi
  fi
  rm -f "$f"
done
echo "[stop] done"
