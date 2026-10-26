#!/usr/bin/env bash
set -uo pipefail

export STORY_ENGINE_URL="${STORY_ENGINE_URL:-http://127.0.0.1:8001}"

# Narration goes through the Mind Engine by default in prod; set MIND_ENGINE=off
# in the host env to keep the stateless /narrate-day path.
export MIND_ENGINE="${MIND_ENGINE:-on}"

cd /app/story-engine
if ! /opt/venv/bin/alembic upgrade head; then
  echo "WARN: alembic upgrade failed — mind endpoints will run degraded, narrator unaffected" >&2
fi
cd /app

/opt/venv/bin/uvicorn app.main:app --app-dir /app/story-engine --host 127.0.0.1 --port 8001 &
story_engine_pid=$!
node /app/backend/server.js &
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
