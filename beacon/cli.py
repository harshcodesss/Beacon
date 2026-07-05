"""Beacon CLI — the dev loop entry point.

    python -m beacon.cli --incident demo [--config beacon.yml] [--json]

Calls exactly what the backend and the GitHub Action call:
`beacon.graph.build.app.invoke(...)`. Nothing here may import agent internals.
"""

import argparse
import json
import sys

from beacon.config import load_config


def main() -> None:
    parser = argparse.ArgumentParser(prog="beacon")
    parser.add_argument("--incident", required=True, help="incident id / label")
    parser.add_argument("--config", default=None, help="path to beacon.yml")
    parser.add_argument("--json", action="store_true",
                        help="print the full result state as JSON instead of the report")
    args = parser.parse_args()

    cfg = load_config(args.config)

    try:
        from beacon.graph.build import app
    except ModuleNotFoundError:
        sys.exit(
            "beacon.graph.build not found — the agent graph isn't built yet.\n"
            "Create beacon/graph/state.py and beacon/graph/build.py (compiled "
            "graph exported as `app`), then re-run."
        )

    result = app.invoke({"incident_id": args.incident, "budget": cfg["budget"]})

    if args.json:
        print(json.dumps(result, indent=2, default=str))
    else:
        print(result.get("report") or "(no report in result state)")


if __name__ == "__main__":
    main()
