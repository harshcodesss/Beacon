"""Seed the triage target at <repo-root>/.demo_target.

Copies the demo app into .demo_target (gitignored) and git-inits it there as
its own repository with a handful of realistic commits, so the Collector has
git history to read and fault scripts have a clean repo to commit into —
without polluting the Beacon repo's history.

    python demo_app/seed_target.py        # run from the Beacon repo root
"""

import shutil
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SRC = REPO_ROOT / "demo_app"
DEST = REPO_ROOT / ".demo_target"
MARKER = ".beacon_demo_target"

APP_FILES = ["app.py", "db.py", "payments.py", "traffic.py", "README.md"]

# Small follow-up commits applied on top of the initial one, so `git log -p`
# has real, recent diffs to show. (path, old, new, commit message)
TWEAKS = [
    ("db.py", "for i in range(1, 21)", "for i in range(1, 41)",
     "seed more demo users"),
    ("payments.py", "DEFAULT_TIMEOUT_MS = 800", "DEFAULT_TIMEOUT_MS = 650",
     "tighten payment provider timeout"),
    ("app.py", "SLOW_REQUEST_MS = 1000", "SLOW_REQUEST_MS = 500",
     "flag slow requests above 500ms"),
    ("README.md", "# demo-target", "# demo-target service",
     "clarify service name in readme"),
]


def git(*args: str) -> None:
    subprocess.run(
        ["git", "-c", "user.name=Demo Dev", "-c", "user.email=dev@example.com", *args],
        cwd=DEST, check=True, capture_output=True, text=True,
    )


def main() -> None:
    if DEST.exists():
        if not (DEST / MARKER).exists():
            sys.exit(f"refusing to delete {DEST}: marker file {MARKER} missing")
        shutil.rmtree(DEST)

    DEST.mkdir()
    (DEST / MARKER).touch()
    (DEST / "logs").mkdir()
    (DEST / ".gitignore").write_text(f"logs/\n__pycache__/\n{MARKER}\n")
    for name in APP_FILES:
        shutil.copy(SRC / name, DEST / name)

    git("init", "-b", "main")
    git("add", "-A")
    git("commit", "-m", "initial demo service")

    for path, old, new, message in TWEAKS:
        f = DEST / path
        text = f.read_text()
        if old not in text:
            sys.exit(f"seed tweak failed: {old!r} not found in {path}")
        f.write_text(text.replace(old, new, 1))
        git("add", path)
        git("commit", "-m", message)

    print(f"seeded {DEST} with {1 + len(TWEAKS)} commits")
    print("next: cd .demo_target && DB_URL=sqlite:///demo.db uvicorn app:app --port 9000")
    print("then: python traffic.py --seconds 60")


if __name__ == "__main__":
    main()
