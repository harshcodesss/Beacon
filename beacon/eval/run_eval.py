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
import os
import re
import subprocess
import time
from datetime import datetime, timedelta
from pathlib import Path

from beacon.eval.faults import FAULTS, Fault, write_ground_truth
from beacon.eval.judge import judge_scenario, score_suite

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

    state = app.invoke({"incident_id": fault.name, "budget": {"max_tool_calls": 15}})
    result = judge_scenario(state, fault.ground_truth(guilty_commit), use_llm=use_llm)
    result["fault"] = fault.name
    print(f"  {fault.name:22} top1={result['matched_top1']!s:5} "
          f"top3={result['matched_top3']!s:5} (accepted={result['n_accepted']})")
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--include-holdout", action="store_true")
    parser.add_argument("--no-llm", action="store_true")
    args = parser.parse_args()

    write_ground_truth(REPO_ROOT / "beacon" / "eval" / "ground_truth")
    scenarios = [f for f in FAULTS if args.include_holdout or not f.holdout]

    clean_head = _git_target("rev-parse", "HEAD")
    print(f"running {len(scenarios)} scenarios...")
    results = [run_one(f, use_llm=not args.no_llm, clean_head=clean_head) for f in scenarios]
    _git_target("reset", "--hard", clean_head)  # leave the target pristine

    score = score_suite(results)
    print(f"\nTOP-1 accuracy: {score['top1_accuracy']:.0%}"
          f"   TOP-3 accuracy: {score['top3_accuracy']:.0%}"
          f"   ({score['scenarios']} scenarios)")


if __name__ == "__main__":
    main()
