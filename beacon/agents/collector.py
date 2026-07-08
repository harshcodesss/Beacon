"""Agent 1 — Collector. Pure Python, no LLM.

Compresses raw telemetry into a context pack the downstream LLM can afford
to read: drain3 clusters thousands of log lines into a handful of templates,
clusters that exist in the incident window but not the pre-incident baseline
are flagged NEW (they usually ARE the incident), and recent commits ride
along as the other prime suspect. The pack is hard-capped at ~8K tokens by
degrading gracefully — patches shrink before clusters are dropped.
"""

import json
import os
import re

from drain3 import TemplateMiner

from beacon.adapters.git_diff import recent_commits
from beacon.adapters.logs_file import read_recent_logs
from beacon.config import load_config
from beacon.graph.state import BeaconState

# window override lets callers (e.g. the GitHub Action's window_minutes input)
# widen the incident window without a config file
INCIDENT_MINUTES = int(os.environ.get("BEACON_WINDOW_MINUTES", "30"))
BASELINE_MINUTES = 120   # the window immediately before the incident window
MAX_PACK_TOKENS = 8000
MAX_CLUSTERS = 15
EXAMPLES_PER_CLUSTER = 3

# strip the `2026-07-06 01:08:53,026 ` prefix before mining: timestamps are
# pure noise to the template miner, and examples keep the raw line anyway
_TS_PREFIX = re.compile(r"^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}[,.]?\d*\s+")


def collect(state: BeaconState) -> dict:
    cfg = load_config()

    incident_lines = read_recent_logs(minutes=INCIDENT_MINUTES)
    baseline_lines = read_recent_logs(
        minutes=INCIDENT_MINUTES + BASELINE_MINUTES,
        until_minutes_ago=INCIDENT_MINUTES,
    )

    pack = {
        "service": cfg["service"],
        "window": f"last {INCIDENT_MINUTES}m",
        "error_rate": _error_rate(incident_lines, baseline_lines),
        "error_clusters": _cluster_windows(baseline_lines, incident_lines),
        "recent_deploys": recent_commits(),
    }
    return {"context_pack": _truncate_to_budget(pack, MAX_PACK_TOKENS)}


def _join_multiline(lines: list[str]) -> list[str]:
    """Fold continuation lines (tracebacks — no timestamp prefix) into their
    parent entry, so one exception mines as ONE cluster instead of one
    cluster per stack-trace line."""
    entries: list[str] = []
    for line in lines:
        if _TS_PREFIX.match(line) or not entries:
            entries.append(line)
        else:
            entries[-1] += " | " + line.strip()
    return entries


def _cluster_windows(baseline_lines: list[str], incident_lines: list[str]) -> list[dict]:
    """One miner over both windows, so a template gets the same cluster id
    wherever it appears — NEW is then a plain set difference on ids."""
    miner = TemplateMiner()

    baseline_ids = set()
    for entry in _join_multiline(baseline_lines):
        result = miner.add_log_message(_TS_PREFIX.sub("", entry))
        baseline_ids.add(result["cluster_id"])

    stats: dict[int, dict] = {}
    for entry in _join_multiline(incident_lines):
        result = miner.add_log_message(_TS_PREFIX.sub("", entry))
        s = stats.setdefault(result["cluster_id"], {"count": 0, "examples": []})
        s["count"] += 1
        if len(s["examples"]) < EXAMPLES_PER_CLUSTER:
            # raw entry, timestamp intact: citable; capped so one traceback
            # can't eat the token budget
            s["examples"].append(entry[:400])

    templates = {c.cluster_id: c.get_template() for c in miner.drain.clusters}
    clusters = [
        {
            "template": templates.get(cid, ""),
            "count": s["count"],
            "is_new": cid not in baseline_ids,
            "examples": s["examples"],
        }
        for cid, s in stats.items()
    ]
    # new clusters are the gold signal: surface them first, then by volume
    clusters.sort(key=lambda c: (not c["is_new"], -c["count"]))
    return clusters[:MAX_CLUSTERS]


def _error_rate(incident_lines: list[str], baseline_lines: list[str]) -> dict:
    incident = sum(1 for l in incident_lines if " ERROR " in l)
    baseline = sum(1 for l in baseline_lines if " ERROR " in l)
    return {
        "incident_errors_per_min": round(incident / INCIDENT_MINUTES, 2),
        "baseline_errors_per_min": round(baseline / BASELINE_MINUTES, 2),
    }


def _estimate_tokens(obj) -> int:
    return len(json.dumps(obj)) // 4  # ~4 chars/token: crude but cheap


def _truncate_to_budget(pack: dict, max_tokens: int) -> dict:
    """Degrade in order of least informative first: shrink commit patches,
    then trim examples, then drop low-ranked clusters."""
    steps = [
        lambda: _cap_patches(pack, 2000),
        lambda: _cap_patches(pack, 800),
        lambda: _cap_examples(pack, 1),
        lambda: _cap_clusters(pack, 8),
        lambda: _cap_patches(pack, 200),
    ]
    for step in steps:
        if _estimate_tokens(pack) <= max_tokens:
            break
        step()
    pack["approx_tokens"] = _estimate_tokens(pack)
    return pack


def _cap_patches(pack: dict, max_chars: int) -> None:
    for commit in pack["recent_deploys"]:
        if len(commit["patch"]) > max_chars:
            commit["patch"] = commit["patch"][:max_chars] + "\n... [patch truncated]"


def _cap_examples(pack: dict, per_cluster: int) -> None:
    for cluster in pack["error_clusters"]:
        cluster["examples"] = cluster["examples"][:per_cluster]


def _cap_clusters(pack: dict, keep: int) -> None:
    pack["error_clusters"] = pack["error_clusters"][:keep]
