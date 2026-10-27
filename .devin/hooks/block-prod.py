"""PreToolUse hook: block commands that touch production, secrets, or master.

Reads the tool-call event JSON on stdin. Exit 2 blocks the action.
"""
import json
import re
import subprocess
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

# A bare `git push` (or `git push origin`) pushes the current branch — the
# string block above only catches explicit `push origin master`, so resolve
# the actual target ref.
push = re.search(r"\bgit\s+push\b(.*)", cmd)
if push:
    tokens = [
        t for t in push.group(1).split()
        if not t.startswith("-") and t not in ("origin", "upstream") and not t.startswith("2>")
    ]
    target = tokens[-1].split(":")[-1] if tokens else None
    if target is None:
        try:
            target = subprocess.run(
                ["git", "branch", "--show-current"],
                capture_output=True, text=True, timeout=5
            ).stdout.strip()
        except Exception:
            target = ""
    if target in ("master", "main"):
        print("Blocked: implicit git push would target master — requires a human",
              file=sys.stderr)
        sys.exit(2)

sys.exit(0)
