#!/usr/bin/env bash
set -uo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export MIND_ENGINE_URL="${MIND_ENGINE_URL:-http://127.0.0.1:8001}"

"$root_dir/mind-engine/.venv/bin/uvicorn" app.main:app --app-dir "$root_dir/mind-engine" --host 127.0.0.1 --port 8001 --reload --reload-dir "$root_dir/mind-engine" &
mind_engine_pid=$!
"$root_dir/backend/node_modules/.bin/nodemon" "$root_dir/backend/server.js" &
backend_pid=$!

shutdown() {
  kill -TERM "$mind_engine_pid" "$backend_pid" 2>/dev/null || true
  wait "$mind_engine_pid" "$backend_pid" 2>/dev/null || true
}

trap shutdown TERM INT
while kill -0 "$mind_engine_pid" "$backend_pid" 2>/dev/null; do
  sleep 1
done

if kill -0 "$mind_engine_pid" 2>/dev/null; then
  wait "$backend_pid"
  status=$?
else
  wait "$mind_engine_pid"
  status=$?
fi

shutdown
exit "$status"
