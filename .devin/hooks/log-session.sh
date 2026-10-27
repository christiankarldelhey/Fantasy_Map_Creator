#!/bin/bash
# SessionStart/SessionEnd hook: append a line to the session log.
# Usage: log-session.sh <event>
# Feeds the run log (docs/agents/runs.jsonl) at log-run time.
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo "$PWD")"
printf '{"event":"%s","ts":"%s","cwd":"%s"}\n' \
  "$1" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$PWD" \
  >> "$ROOT/.devin/session-log.jsonl"
