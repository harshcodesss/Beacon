"""Load beacon.yml.

Resolution order for the config file:
  1. explicit `path` argument
  2. $BEACON_CONFIG
  3. ./beacon.yml (current working directory)

Missing file or missing keys fall back to DEFAULTS, so everything works
out of the box against the seeded .demo_target.
"""

import copy
import os

import yaml

DEFAULTS: dict = {
    "service": "demo-target",
    "logs": {"adapter": "file", "path": "./.demo_target/logs/app.log"},
    "metrics": {"adapter": "stub"},
    "repo": {"path": "./.demo_target", "diff_window": 5},
    "budget": {"max_tool_calls": 15, "max_tokens": 60000},
}


def _merge(base: dict, override: dict) -> dict:
    out = copy.deepcopy(base)
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(out.get(key), dict):
            out[key] = _merge(out[key], value)
        else:
            out[key] = value
    return out


def load_config(path: str | None = None) -> dict:
    path = path or os.environ.get("BEACON_CONFIG", "beacon.yml")
    if not os.path.exists(path):
        return copy.deepcopy(DEFAULTS)
    with open(path) as f:
        loaded = yaml.safe_load(f) or {}
    return _merge(DEFAULTS, loaded)
