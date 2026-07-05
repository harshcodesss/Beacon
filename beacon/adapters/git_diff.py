"""Git history adapter: recent commits with truncated patches.

Uses subprocess git rather than GitPython — no state, no locking, and the
output is exactly what a human would see, which is what the LLM should see.
"""

import subprocess

from beacon.config import load_config


def _git(repo_path: str, *args: str) -> str:
    result = subprocess.run(
        ["git", "-C", repo_path, *args],
        check=True, capture_output=True, text=True,
    )
    return result.stdout


def recent_commits(
    n: int | None = None,
    max_patch_chars: int = 4000,
    repo_path: str | None = None,
) -> list[dict]:
    """Return the last n commits, newest first:
    [{hash, author, date, message, patch}] with each patch truncated.
    """
    cfg = load_config()["repo"]
    repo_path = repo_path or cfg["path"]
    n = n or cfg["diff_window"]

    try:
        hashes = _git(repo_path, "rev-list", "-n", str(n), "HEAD").split()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return []

    commits = []
    for h in hashes:
        meta = _git(repo_path, "show", "-s", "--format=%H%x1f%an%x1f%aI%x1f%s", h)
        full_hash, author, date, message = meta.strip().split("\x1f")
        patch = _git(repo_path, "show", "--stat", "--patch", "--format=", h)
        if len(patch) > max_patch_chars:
            patch = patch[:max_patch_chars] + "\n... [patch truncated]"
        commits.append({
            "hash": full_hash[:12],
            "author": author,
            "date": date,
            "message": message,
            "patch": patch,
        })
    return commits
