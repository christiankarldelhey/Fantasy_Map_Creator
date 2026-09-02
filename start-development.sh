#!/usr/bin/env bash
set -uo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export STORY_ENGINE_URL="${STORY_ENGINE_URL:-http://127.0.0.1:8001}"

"$root_dir/story-engine/.venv/bin/uvicorn" app.main:app --app-dir "$root_dir/story-engine" --host 127.0.0.1 --port 8001 --reload --reload-dir "$root_dir/story-engine" &
story_engine_pid=$!
"$root_dir/backend/node_modules/.bin/nodemon" "$root_dir/backend/server.js" &
backend_pid=$!

shutdown() {
  kill -TERM "$story_engine_pid" "$backend_pid" 2>/dev/null || true
  wait "$story_engine_pid" "$backend_pid" 2>/dev/null || true
}

trap shutdown TERM INT
while kill -0 "$story_engine_pid" "$backend_pid" 2>/dev/null; do
  sleep 1
done

if kill -0 "$story_engine_pid" 2>/dev/null; then
  wait "$backend_pid"
  status=$?
else
  wait "$story_engine_pid"
  status=$?
fi

shutdown
exit "$status"
