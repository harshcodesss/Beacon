"""Adapter tests. Run from the repo root: .venv/bin/python -m pytest tests/"""

import subprocess
from datetime import datetime

from beacon.adapters.git_diff import recent_commits
from beacon.adapters.logs_file import read_recent_logs
from beacon.config import DEFAULTS, load_config

NOW = datetime(2026, 7, 6, 12, 0, 0)


def _write_log(tmp_path, lines):
    p = tmp_path / "app.log"
    p.write_text("\n".join(lines) + "\n")
    return str(p)


def test_logs_window_filtering(tmp_path):
    path = _write_log(tmp_path, [
        "2026-07-06 10:00:00,123 INFO demo old line",
        "2026-07-06 11:45:00,123 INFO demo recent line",
        "2026-07-06 11:59:00,123 ERROR demo very recent line",
    ])
    got = read_recent_logs(minutes=30, path=path, now=NOW)
    assert len(got) == 2
    assert "recent line" in got[0] and "very recent line" in got[1]
    assert all("old line" not in l for l in got)


def test_logs_baseline_window(tmp_path):
    path = _write_log(tmp_path, [
        "2026-07-06 10:00:00 INFO demo baseline line",
        "2026-07-06 11:50:00 INFO demo incident line",
    ])
    baseline = read_recent_logs(minutes=150, until_minutes_ago=30, path=path, now=NOW)
    assert len(baseline) == 1 and "baseline" in baseline[0]


def test_logs_traceback_lines_inherit_timestamp(tmp_path):
    path = _write_log(tmp_path, [
        "2026-07-06 11:55:00,000 ERROR demo payment failed",
        "Traceback (most recent call last):",
        '  File "app.py", line 10, in charge',
        "TimeoutError: provider timed out",
    ])
    got = read_recent_logs(minutes=30, path=path, now=NOW)
    assert len(got) == 4  # traceback lines ride along with their parent line


def test_logs_missing_file_returns_empty():
    assert read_recent_logs(minutes=30, path="/nonexistent/app.log") == []


def test_config_defaults_and_merge(tmp_path):
    cfg_file = tmp_path / "beacon.yml"
    cfg_file.write_text("service: myapp\nrepo:\n  diff_window: 3\n")
    cfg = load_config(str(cfg_file))
    assert cfg["service"] == "myapp"
    assert cfg["repo"]["diff_window"] == 3
    assert cfg["budget"] == DEFAULTS["budget"]  # untouched keys keep defaults


def test_recent_commits_and_truncation(tmp_path):
    repo = tmp_path / "repo"
    repo.mkdir()

    def git(*args):
        subprocess.run(
            ["git", "-c", "user.name=T", "-c", "user.email=t@t.t", "-C", str(repo), *args],
            check=True, capture_output=True,
        )

    git("init", "-b", "main")
    (repo / "a.py").write_text("x = 1\n" * 500)
    git("add", "-A")
    git("commit", "-m", "big initial commit")
    (repo / "a.py").write_text("x = 2\n")
    git("add", "-A")
    git("commit", "-m", "shrink a.py")

    commits = recent_commits(n=5, max_patch_chars=300, repo_path=str(repo))
    assert [c["message"] for c in commits] == ["shrink a.py", "big initial commit"]
    assert all(len(c["patch"]) <= 300 + len("\n... [patch truncated]") for c in commits)
    assert commits[1]["patch"].endswith("[patch truncated]")
