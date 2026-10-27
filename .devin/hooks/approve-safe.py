"""PermissionRequest hook: auto-approve safe commands.

Background subagents cannot ask for permissions — approve read-only and
test/build commands so they never stall. Prints {"decision": "approve"}
on stdout when the command is whitelisted; exits 0 otherwise (falls
through to the normal permission flow).
"""
import json
import sys

data = json.load(sys.stdin)
cmd = data.get("tool_input", {}).get("command", "").strip()

SAFE = (
    # local git read
    "git status", "git diff", "git log", "git show", "git branch",
    "git worktree list", "git rev-parse", "git ls-files", "git check-ignore",
    # tests / builds / typecheck
    "npm test", "npm run build", "node --test", "pytest", "vue-tsc",
    # github read
    "gh issue list", "gh issue view", "gh pr list", "gh pr view", "gh pr diff",
    # trivial reads
    "ls", "cat", "pwd", "find", "du",
)

if cmd.startswith(SAFE):
    print(json.dumps({"decision": "approve"}))
sys.exit(0)
