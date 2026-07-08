"""Beacon GitHub Action entrypoint.

Flow (see action.yml at the repo root for inputs):
  1. Pick the engine: the REAL agent core when a Gemini API key is provided
     (the image ships the beacon package), otherwise the bundled mock with
     the identical contract — so the action can be tried without any key.
  2. Real core: point beacon's config at the user's workspace (their log file,
     their git history) and let the pipeline do its own windowing/clustering.
     Mock: collect the trailing window here and pass it through.
  3. POST the finished report to {api_url}/webhook/github (API-key auth) —
     optional, only when a Beacon dashboard key is configured.
  4. Comment the report on the triggering PR/issue when a token is available.

Steps 3 and 4 degrade gracefully: a delivery failure is logged as a workflow
warning but only a triage failure fails the action.
"""

import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timedelta, timezone

_ISO_PREFIX = re.compile(r"^(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2})")
MAX_FALLBACK_LINES = 2000
_RUNTIME_CONFIG = "/tmp/beacon-runtime.yml"


def log(level: str, message: str) -> None:
    # ::warning:: / ::error:: render as annotations in the workflow UI.
    print(f"::{level}::{message}" if level in ("warning", "error") else message)


def _prepare_real_config(log_path: str) -> None:
    """Point the agent core at the user's workspace. Written as a runtime
    beacon.yml (unless the repo ships its own) and exposed via BEACON_CONFIG.
    Must run BEFORE importing beacon.graph.build — the agents read env at
    import time."""
    workspace = os.environ.get("GITHUB_WORKSPACE", ".")
    repo_name = os.environ.get("GITHUB_REPOSITORY", "service").split("/")[-1]

    # the checkout is owned by a different uid than the container user; git
    # refuses to read it without this
    try:
        subprocess.run(
            ["git", "config", "--global", "--add", "safe.directory", workspace],
            check=False, capture_output=True,
        )
        subprocess.run(
            ["git", "config", "--global", "--add", "safe.directory", "*"],
            check=False, capture_output=True,
        )
    except FileNotFoundError:
        log("warning", "git not available; recent-commit evidence will be empty")

    user_config = os.path.join(workspace, "beacon.yml")
    if os.path.exists(user_config):
        os.environ["BEACON_CONFIG"] = user_config
        log("", f"Using the repository's own beacon.yml ({user_config}).")
        return

    with open(_RUNTIME_CONFIG, "w", encoding="utf-8") as fh:
        fh.write(
            f"service: {repo_name}\n"
            f"logs:\n  adapter: file\n  path: {log_path}\n"
            f"repo:\n  path: .\n  diff_window: 5\n"
            f"budget:\n  max_tool_calls: 15\n  max_tokens: 60000\n"
        )
    os.environ["BEACON_CONFIG"] = _RUNTIME_CONFIG


def load_graph(log_path: str):
    """Return (graph, kind). Real core needs a Gemini key; anything else
    falls back to the bundled mock so the action stays try-before-you-buy."""
    if os.environ.get("GEMINI_API_KEY"):
        try:
            _prepare_real_config(log_path)
            from beacon.graph.build import app as real_graph
            log("", "Engine: REAL agent core (beacon.graph.build).")
            return real_graph, "real"
        except ModuleNotFoundError:
            log("warning", "beacon package missing from image; using bundled mock")
    else:
        log("warning",
            "No gemini_api_key input set — using the bundled mock "
            "(canned demo report, not real triage).")
    from mock_beacon import app as mock_graph
    return mock_graph, "mock"


def collect_window(log_path: str, window_minutes: int) -> str:
    """Trailing time window of the log; falls back to a line count when
    lines carry no parseable ISO timestamps."""
    try:
        with open(log_path, encoding="utf-8", errors="replace") as fh:
            lines = fh.read().splitlines()
    except OSError as exc:
        log("warning", f"Could not read {log_path}: {exc}; triaging empty window")
        return ""

    cutoff = datetime.now(timezone.utc) - timedelta(minutes=window_minutes)
    windowed: list[str] = []
    saw_timestamp = False
    for line in lines:
        match = _ISO_PREFIX.match(line)
        if match:
            saw_timestamp = True
            stamp = datetime.fromisoformat(match.group(1)).replace(tzinfo=timezone.utc)
            if stamp < cutoff:
                continue
        windowed.append(line)

    if not saw_timestamp:
        windowed = lines[-MAX_FALLBACK_LINES:]
    return "\n".join(windowed)


def post_json(url: str, payload: dict, headers: dict) -> dict:
    body = json.dumps(payload).encode()
    request = urllib.request.Request(
        url, data=body, headers={"Content-Type": "application/json", **headers}
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode() or "{}")


def deliver_to_beacon(api_url: str, api_key: str, result: dict) -> str | None:
    budget_used = result.get("budget") or {}
    payload = {
        "report_md": result["report"],
        "verdicts": result.get("verdicts"),
        "hypotheses": result.get("hypotheses"),
        "accuracy_meta": {"source": "github-action"},
        "tokens_used": int(budget_used.get("tokens_used", 0)),
        "tool_calls_used": int(budget_used.get("tool_calls_used", 0)),
    }
    try:
        out = post_json(
            f"{api_url.rstrip('/')}/webhook/github", payload, {"X-Beacon-Key": api_key}
        )
        return str(out.get("incident_id", ""))
    except (urllib.error.URLError, OSError, ValueError) as exc:
        log("warning", f"Failed to deliver report to Beacon: {exc}")
        return None


def issue_number_from_event() -> int | None:
    event_path = os.environ.get("GITHUB_EVENT_PATH", "")
    if not event_path or not os.path.exists(event_path):
        return None
    with open(event_path, encoding="utf-8") as fh:
        event = json.load(fh)
    if event.get("pull_request"):
        return int(event["pull_request"]["number"])
    if event.get("issue"):
        return int(event["issue"]["number"])
    pulls = (event.get("workflow_run") or {}).get("pull_requests") or []
    if pulls:
        return int(pulls[0]["number"])
    return None


def comment_on_github(token: str, report_md: str, incident_id: str | None) -> None:
    repo = os.environ.get("GITHUB_REPOSITORY", "")
    number = issue_number_from_event()
    if not (token and repo and number):
        log("", "No PR/issue to comment on (or no token); skipping comment.")
        return
    footer = f"\n\n---\nIncident `{incident_id}` in the Beacon dashboard." if incident_id else ""
    try:
        post_json(
            f"https://api.github.com/repos/{repo}/issues/{number}/comments",
            {"body": report_md + footer},
            {
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github+json",
            },
        )
        log("", f"Commented triage report on {repo}#{number}.")
    except (urllib.error.URLError, OSError) as exc:
        log("warning", f"Failed to comment on {repo}#{number}: {exc}")


def write_output(name: str, value: str) -> None:
    output_path = os.environ.get("GITHUB_OUTPUT", "")
    if output_path:
        with open(output_path, "a", encoding="utf-8") as fh:
            fh.write(f"{name}={value}\n")


def main() -> int:
    api_key = os.environ.get("BEACON_API_KEY", "")
    log_path = os.environ.get("BEACON_LOG_PATH", "./logs/app.log")
    window_minutes = int(os.environ.get("BEACON_WINDOW_MINUTES", "30"))
    api_url = os.environ.get("BEACON_API_URL", "https://api.beacon.dev")

    beacon_graph, engine = load_graph(log_path)

    state: dict = {
        "incident_id": str(uuid.uuid4()),
        "budget": {"max_tool_calls": 15, "max_tokens": 60000},
    }
    if engine == "mock":
        # the real collector reads the log file itself; only the mock needs
        # the window pre-collected and passed through
        raw_log = collect_window(log_path, window_minutes)
        log("", f"Collected {len(raw_log.splitlines())} log lines from {log_path}.")
        state["raw_log"] = raw_log

    try:
        result = beacon_graph.invoke(state)
    except Exception as exc:  # noqa: BLE001 - triage failure fails the action
        log("error", f"Triage failed: {exc}")
        return 1

    report_path = os.path.join(os.environ.get("GITHUB_WORKSPACE", "."), "beacon-report.md")
    try:
        with open(report_path, "w", encoding="utf-8") as fh:
            fh.write(result["report"])
        write_output("report_path", report_path)
    except OSError as exc:
        log("warning", f"Could not write {report_path}: {exc}")

    incident_id = None
    if api_key:
        incident_id = deliver_to_beacon(api_url, api_key, result)
        if incident_id:
            write_output("incident_id", incident_id)
            log("", f"Report delivered to Beacon (incident {incident_id}).")
    else:
        log("", "No beacon_api_key set; skipping dashboard delivery.")

    comment_on_github(os.environ.get("GITHUB_TOKEN", ""), result["report"], incident_id)
    return 0


if __name__ == "__main__":
    sys.exit(main())
