"""Fault scenarios + their ground truth.

Each Fault breaks the demo target in ONE known way, using the levers the demo
app actually exposes (see demo_app/README.md), and declares the ground truth the
Judge scores against. Declarative on purpose — one source of truth beats 10
near-identical scripts, and run_eval writes each one out to ground_truth/*.json
for the record.

`env` values are applied to the demo app's environment; a value of None means
"ensure this variable is UNSET" (that's how the missing-env-var fault works).
Two scenarios are held out — never look at them while iterating prompts, so the
headline accuracy isn't overfit.
"""

import json
from dataclasses import dataclass, field
from pathlib import Path


@dataclass(frozen=True)
class Fault:
    name: str
    fault_type: str                       # config | dependency | code
    description: str
    guilty_component: str
    env: dict[str, str | None] = field(default_factory=dict)
    guilty_commit: str | None = None      # set dynamically for code faults
    holdout: bool = False

    def ground_truth(self) -> dict:
        return {
            "fault_type": self.fault_type,
            "guilty_component": self.guilty_component,
            "guilty_commit": self.guilty_commit,
            "description": self.description,
        }


FAULTS: list[Fault] = [
    Fault(
        name="missing_db_url",
        fault_type="config",
        description="DB_URL env var not configured — every request 500s at db._require_db",
        guilty_component="db.py",
        env={"DB_URL": None},
    ),
    Fault(
        name="payment_timeout",
        fault_type="dependency",
        description="Payment provider latency exceeds the client timeout — /orders return 504s",
        guilty_component="payments.py",
        env={"DB_URL": "sqlite:///demo.db", "PAYMENT_LATENCY_MS": "3000"},
    ),
    Fault(
        name="payment_rejections",
        fault_type="dependency",
        description="Payment provider rejecting ~half of charges — /orders return 502s",
        guilty_component="payments.py",
        env={"DB_URL": "sqlite:///demo.db", "PAYMENT_FAIL_RATE": "0.5"},
    ),
    Fault(
        name="slow_payment_provider",
        fault_type="dependency",
        description="Elevated payment latency near the timeout ceiling — intermittent slow /orders",
        guilty_component="payments.py",
        env={"DB_URL": "sqlite:///demo.db", "PAYMENT_LATENCY_MS": "600"},
        holdout=True,
    ),
    Fault(
        name="db_outage_midrun",
        fault_type="config",
        description="DB_URL removed partway through — a burst of 500s after a clean baseline",
        guilty_component="db.py",
        env={"DB_URL": None},
        holdout=True,
    ),
]

FAULTS_BY_NAME = {f.name: f for f in FAULTS}


def write_ground_truth(out_dir: str | Path) -> list[Path]:
    """Serialize each fault's ground truth to <out_dir>/<name>.json."""
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    written = []
    for fault in FAULTS:
        path = out / f"{fault.name}.json"
        path.write_text(json.dumps(fault.ground_truth(), indent=2))
        written.append(path)
    return written
