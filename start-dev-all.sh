#!/usr/bin/env bash
set -uo pipefail

# Runs the whole local stack: story-engine (:8001), backend (nodemon),
# frontend (:5173) and mind-studio (:5180/studio/). Ctrl-C stops all four.
# mind-studio proxies /studio/api to the story-engine; export STUDIO_AUTH
# (user:pass) beforehand if studio auth is enabled.

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export STORY_ENGINE_URL="${STORY_ENGINE_URL:-http://127.0.0.1:8001}"

for bin in \
  "$root_dir/story-engine/.venv/bin/uvicorn" \
  "$root_dir/backend/node_modules/.bin/nodemon" \
  "$root_dir/frontend/node_modules/.bin/vite" \
  "$root_dir/mind-studio/node_modules/.bin/vite"; do
  if [[ ! -x "$bin" ]]; then
    echo "missing $bin — run npm install / venv setup in that package first" >&2
    exit 1
  fi
done

pids=()
"$root_dir/story-engine/.venv/bin/uvicorn" app.main:app --app-dir "$root_dir/story-engine" --host 127.0.0.1 --port 8001 --reload --reload-dir "$root_dir/story-engine" &
pids+=($!)
"$root_dir/backend/node_modules/.bin/nodemon" "$root_dir/backend/server.js" &
pids+=($!)
# exec replaces the subshell so the pid is vite's, and cd keeps cwd inside
# the package — Tailwind resolves its config from cwd and breaks otherwise.
(cd "$root_dir/frontend" && exec "$root_dir/frontend/node_modules/.bin/vite") &
pids+=($!)
(cd "$root_dir/mind-studio" && exec "$root_dir/mind-studio/node_modules/.bin/vite") &
pids+=($!)

cat <<URLS

  frontend    → http://localhost:5173
  mind-studio → http://localhost:5180/studio/
  backend     → http://localhost:5001
  story-engine→ http://127.0.0.1:8001

URLS

shutdown() {
  kill -TERM "${pids[@]}" 2>/dev/null || true
  wait "${pids[@]}" 2>/dev/null || true
}

trap shutdown TERM INT
# Exit when any service dies
while kill -0 "${pids[@]}" 2>/dev/null; do
  sleep 1
done

shutdown
