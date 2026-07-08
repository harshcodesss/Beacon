"""Fault-injection eval harness — the runnable loop behind the headline numbers.

For each scenario: generate a clean baseline, inject the fault, generate the
incident traffic, run the full Beacon graph, and let the Judge score the result.
Aggregates top-1 / top-3 accuracy across the suite.

    python -m beacon.eval.run_eval               # all non-holdout scenarios
    python -m beacon.eval.run_eval --include-holdout
    python -m beacon.eval.run_eval --no-llm      # deterministic Judge only

Prereqs: a seeded target (python demo_app/seed_target.py) and GEMINI_API_KEY.
This is dev tooling, not shipped — it starts/stops the demo uvicorn itself.
"""

import argparse
import json
import os
import re
import subprocess
import time
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path

from langchain_core.callbacks import BaseCallbackHandler

from beacon.eval.faults import FAULTS, Fault, write_ground_truth
from beacon.eval.judge import judge_scenario, score_suite


class _Meter(BaseCallbackHandler):
    """Counts LLM API calls (per graph node) and tokens for one scenario."""

    def __init__(self):
        self.calls = defaultdict(int)
        self.tokens_in = 0
        self.tokens_out = 0
        self._run_node = {}

    def on_chat_model_start(self, serialized, messages, *, run_id,
                            parent_run_id=None, tags=None, metadata=None, **kw):
        node = (metadata or {}).get("langgraph_node", "?")
        self.calls[node] += 1
        self._run_node[run_id] = node

    def on_llm_end(self, response, *, run_id, parent_run_id=None, **kw):
        self._run_node.pop(run_id, None)
        try:
            usage = response.generations[0][0].message.usage_metadata or {}
        except (AttributeError, IndexError):
            usage = {}
        self.tokens_in += usage.get("input_tokens", 0)
        self.tokens_out += usage.get("output_tokens", 0)

    @property
    def total_calls(self) -> int:
        return sum(self.calls.values())

REPO_ROOT = Path(__file__).resolve().parents[2]
TARGET = REPO_ROOT / ".demo_target"
LOG = TARGET / "logs" / "app.log"
VENV_PY = REPO_ROOT / ".venv" / "bin" / "python"

BASELINE_SECONDS = 12
INCIDENT_SECONDS = 18
RPS = 8


def _child_env(fault_env: dict[str, str | None]) -> dict:
    env = os.environ.copy()
    env.setdefault("DB_URL", "sqlite:///demo.db")
    for key, value in fault_env.items():
        if value is None:
            env.pop(key, None)          # "ensure unset" — the missing-env-var lever
        else:
            env[key] = value
    return env


def _run_phase(env: dict, seconds: int) -> None:
    server = subprocess.Popen(
        [str(VENV_PY), "-m", "uvicorn", "app:app", "--port", "9000"],
        cwd=TARGET, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    try:
        time.sleep(3)
        subprocess.run(
            [str(VENV_PY), "traffic.py", "--seconds", str(seconds), "--rps", str(RPS)],
            cwd=TARGET, check=False,
        )
    finally:
        server.terminate()
        server.wait(timeout=10)


def _backdate_logs(minutes: int) -> None:
    """Shift every timestamped line back, so the baseline phase falls into the
    Collector's pre-incident window instead of overlapping the incident."""
    ts = re.compile(r"^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})")
    out = []
    for line in LOG.read_text().splitlines(keepends=True):
        m = ts.match(line)
        if m:
            shifted = datetime.strptime(m.group(1), "%Y-%m-%d %H:%M:%S") - timedelta(minutes=minutes)
            line = shifted.strftime("%Y-%m-%d %H:%M:%S") + line[19:]
        out.append(line)
    LOG.write_text("".join(out))


def _git_target(*args: str) -> str:
    result = subprocess.run(
        ["git", "-C", str(TARGET), "-c", "user.name=Demo Dev",
         "-c", "user.email=dev@example.com", *args],
        check=True, capture_output=True, text=True,
    )
    return result.stdout.strip()


def _apply_code_fault(fault: Fault) -> str:
    """Apply the fault's edits to the target and commit them — the guilty
    commit the pipeline should find. Returns the commit hash."""
    for path, old, new in fault.edits:
        f = TARGET / path
        text = f.read_text()
        if old not in text:
            raise RuntimeError(f"{fault.name}: edit anchor not found in {path}")
        f.write_text(text.replace(old, new, 1))
        _git_target("add", path)
    _git_target("commit", "-m", fault.commit_message or f"change for {fault.name}")
    return _git_target("rev-parse", "HEAD")


def run_one(fault: Fault, use_llm: bool, clean_head: str) -> dict:
    from beacon.graph.build import app  # lazy: needs the API key

    # every scenario starts from the pristine target: no code-fault bleed-over
    _git_target("reset", "--hard", clean_head)
    LOG.parent.mkdir(exist_ok=True)
    LOG.write_text("")

    _run_phase(_child_env({}), BASELINE_SECONDS)   # clean baseline
    _backdate_logs(60)

    guilty_commit = _apply_code_fault(fault) if fault.edits else None
    _run_phase(_child_env(fault.env), INCIDENT_SECONDS)  # fault injected

    meter = _Meter()
    state = app.invoke(
        {"incident_id": fault.name, "budget": {"max_tool_calls": 15}},
        config={"callbacks": [meter]},
    )
    result = judge_scenario(state, fault.ground_truth(guilty_commit), use_llm=use_llm)
    result["fault"] = fault.name
    result["llm_calls"] = dict(meter.calls)
    result["total_llm_calls"] = meter.total_calls
    result["tokens_in"] = meter.tokens_in
    result["tokens_out"] = meter.tokens_out
    result["tool_calls_used"] = (state.get("budget") or {}).get("tool_calls_used")
    print(f"  {fault.name:22} top1={result['matched_top1']!s:5} "
          f"top3={result['matched_top3']!s:5} (accepted={result['n_accepted']}) "
          f"calls={meter.total_calls} tokens={meter.tokens_in}/{meter.tokens_out}")
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--include-holdout", action="store_true")
    parser.add_argument("--no-llm", action="store_true")
    parser.add_argument("--json-out", default=None,
                        help="write full per-scenario results (incl. API-call counts) to this path")
    args = parser.parse_args()

    write_ground_truth(REPO_ROOT / "beacon" / "eval" / "ground_truth")
    scenarios = [f for f in FAULTS if args.include_holdout or not f.holdout]

    clean_head = _git_target("rev-parse", "HEAD")
    print(f"running {len(scenarios)} scenarios...")
    results = []
    try:
        for fault in scenarios:
            results.append(run_one(fault, use_llm=not args.no_llm, clean_head=clean_head))
    finally:
        _git_target("reset", "--hard", clean_head)  # leave the target pristine
        if results and args.json_out:
            Path(args.json_out).write_text(json.dumps({
                "model": os.environ.get("BEACON_MODEL")
                         or os.environ.get("GEMINI_MODEL") or "default",
                "results": results,
                "score": score_suite(results),
                "total_llm_calls": sum(r["total_llm_calls"] for r in results),
                "total_tokens_in": sum(r["tokens_in"] for r in results),
                "total_tokens_out": sum(r["tokens_out"] for r in results),
            }, indent=2))

    score = score_suite(results)
    total_calls = sum(r["total_llm_calls"] for r in results)
    print(f"\nTOP-1 accuracy: {score['top1_accuracy']:.0%}"
          f"   TOP-3 accuracy: {score['top3_accuracy']:.0%}"
          f"   ({score['scenarios']} scenarios, {total_calls} API calls)")


if __name__ == "__main__":
    main()
