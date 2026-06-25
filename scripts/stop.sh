#!/usr/bin/env bash
# =============================================================================
# stop.sh — Gracefully terminate the background servers started by start.sh.
#
# Reads PIDs from .runtime/pids/*.pid, sends SIGTERM to each, waits 1 second,
# and escalates to SIGKILL if the process is still alive (forcing termination).
# PID files are removed regardless of success so stale files don't accumulate.
# =============================================================================
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RUNTIME="$ROOT/.runtime"
for f in "$RUNTIME"/pids/*.pid; do
  [ -e "$f" ] || continue
  pid=$(cat "$f")
  name=$(basename "$f" .pid)
  if kill -0 "$pid" 2>/dev/null; then
    # Graceful shutdown: send SIGTERM first so the process can clean up
    # (close sockets, flush buffers, etc.).  If it hasn't exited after
    # 1 second, escalate to SIGKILL which the kernel enforces immediately.
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
