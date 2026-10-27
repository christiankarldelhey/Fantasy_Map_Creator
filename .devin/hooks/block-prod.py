"""PreToolUse hook: block commands that touch production, secrets, or master.

Reads the tool-call event JSON on stdin. Exit 2 blocks the action.
"""
import json
import sys

data = json.load(sys.stdin)
cmd = data.get("tool_input", {}).get("command", "")

BLOCKED = [
    # production access (db, deploys)
    "railway up", "railway deploy", "railway run", "PGPASSWORD",
    "up.railway.app", "-production.",
    # secrets
    ".env",
    # master push / destructive git
    "push origin master", "push origin main", "push --force", "push -f",
    "reset --hard",
]

if any(b in cmd for b in BLOCKED):
    print(f"Blocked: '{cmd[:80]}' touches production, secrets or master —"
          " requires a human", file=sys.stderr)
    sys.exit(2)

sys.exit(0)
