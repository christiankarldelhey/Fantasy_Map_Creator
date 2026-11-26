#!/usr/bin/env bash
# Stop hook — mind-map lint before a session ends (ADR-0021).
# Read-only, no DB: fails if a new handler call is undecorated, a @step
# term is not in CONTEXT.md, or the committed artifacts went stale.
set -uo pipefail
root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$root/mind-engine" 2>/dev/null || exit 0
[ -x .venv/bin/python ] || exit 0
.venv/bin/python scripts/mind_map.py --check
