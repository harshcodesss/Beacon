"""Unit tests for the Collector's pure helpers (no drain3, no I/O)."""

from beacon.agents.collector import _error_rate, _join_multiline, _truncate_to_budget


def test_join_multiline_folds_tracebacks():
    lines = [
        "2026-07-06 11:55:00,000 ERROR demo payment failed",
        "Traceback (most recent call last):",
        "TimeoutError: provider timed out",
        "2026-07-06 11:55:01,000 INFO demo request GET / -> 200",
    ]
    entries = _join_multiline(lines)
    assert len(entries) == 2
    assert "Traceback" in entries[0] and "TimeoutError" in entries[0]
    assert entries[1].endswith("200")


def test_error_rate_per_minute():
    incident = ["2026-07-06 11:55:00 ERROR demo boom"] * 30   # 30 errors / 30 min
    baseline = ["2026-07-06 10:00:00 ERROR demo boom"] * 12   # 12 errors / 120 min
    rate = _error_rate(incident, baseline)
    assert rate == {"incident_errors_per_min": 1.0, "baseline_errors_per_min": 0.1}


def test_truncate_degrades_patches_before_dropping_clusters():
    pack = {
        "error_clusters": [
            {"template": f"t{i}", "count": 1, "is_new": False, "examples": ["x" * 300] * 3}
            for i in range(15)
        ],
        "recent_deploys": [{"hash": "abc", "message": "m", "patch": "p" * 6000}],
    }
    out = _truncate_to_budget(pack, max_tokens=2000)
    assert out["approx_tokens"] <= 2000
    # patches were shrunk, and enough clusters survived to stay useful
    assert len(out["recent_deploys"][0]["patch"]) < 6000
    assert len(out["error_clusters"]) >= 8


def test_truncate_noop_when_under_budget():
    pack = {"error_clusters": [], "recent_deploys": []}
    out = _truncate_to_budget(pack, max_tokens=8000)
    assert out["error_clusters"] == [] and out["approx_tokens"] < 100
