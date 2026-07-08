"""Load beacon.yml.

Resolution order for the config file:
  1. explicit `path` argument
  2. $BEACON_CONFIG
  3. ./beacon.yml (current working directory)

Missing file or missing keys fall back to DEFAULTS, which are repo-generic
(logs at ./logs/app.log, git history from the current directory) so Beacon
works on a stranger's repository with zero config. Local development pins
the seeded demo target via the repo-root beacon.yml instead.
"""

import copy
import os

import yaml

DEFAULTS: dict = {
    "service": "app",
    "logs": {"adapter": "file", "path": "./logs/app.log"},
    "metrics": {"adapter": "stub"},
    "repo": {"path": ".", "diff_window": 5},
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
